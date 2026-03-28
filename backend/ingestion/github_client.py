"""
CareerRadar - GitHub GraphQL Client
Async GitHub GraphQL API client for profile ingestion
"""

import asyncio
from typing import List, Dict, Optional, Any
from datetime import datetime, timedelta

import aiohttp

from config.settings import settings
from ingestion.github_schema import GitHubSummary, RepoInfo, ContributionStats


GITHUB_GRAPHQL_ENDPOINT = "https://api.github.com/graphql"


class GitHubClient:
    """Async GitHub GraphQL API client."""

    def __init__(self, token: Optional[str] = None, username: Optional[str] = None):
        self.token = token or settings.github_token
        self.username = username or settings.github_username
        self.headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json",
            "Accept": "application/vnd.github.v4+json",
        }

    async def _execute_graphql(self, query: str, variables: Dict[str, Any]) -> Dict:
        """Execute a GraphQL query against GitHub API."""
        async with aiohttp.ClientSession() as session:
            payload = {"query": query, "variables": variables}
            async with session.post(
                GITHUB_GRAPHQL_ENDPOINT, headers=self.headers, json=payload
            ) as response:
                if response.status != 200:
                    text = await response.text()
                    raise Exception(f"GitHub API error {response.status}: {text}")
                return await response.json()

    async def fetch_user_profile(self) -> Dict[str, Any]:
        """Fetch basic user profile information."""
        query = """
        query($username: String!) {
            user(login: $username) {
                login
                name
                bio
                company
                location
                followers {
                    totalCount
                }
                following {
                    totalCount
                }
                repositories(ownerAffiliations: OWNER, privacy: PUBLIC, first: 100) {
                    totalCount
                    nodes {
                        name
                        description
                        isPrivate
                        stargazerCount
                        forkCount
                        primaryLanguage {
                            name
                            color
                        }
                        languages(first: 10, orderBy: {field: SIZE, direction: DESC}) {
                            edges {
                                node {
                                    name
                                    color
                                }
                                size
                            }
                        }
                        repositoryTopics(first: 10) {
                            nodes {
                                topic {
                                    name
                                }
                            }
                        }
                        defaultBranchRef {
                            target {
                                ... on Commit {
                                    history(first: 1) {
                                        nodes {
                                            committedDate
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
                pullRequests(states: [OPEN, CLOSED, MERGED], first: 100) {
                    totalCount
                }
                issues(states: [OPEN, CLOSED], first: 100) {
                    totalCount
                }
                contributionsCollection {
                    totalCommitContributions
                    totalPullRequestReviewContributions
                    contributionCalendar {
                        totalContributions
                        weeks {
                            contributionDays {
                                contributionCount
                                date
                            }
                        }
                    }
                }
            }
        }
        """
        result = await self._execute_graphql(query, {"username": self.username})

        if "errors" in result:
            raise Exception(f"GraphQL errors: {result['errors']}")

        return result["data"]["user"]

    async def fetch_readme(self) -> Optional[str]:
        """Fetch user's profile README content."""
        query = """
        query($username: String!) {
            user(login: $username) {
                repository(name: $username) {
                    object(expression: "HEAD:README.md") {
                        ... on Blob {
                            text
                        }
                    }
                }
            }
        }
        """
        result = await self._execute_graphql(query, {"username": self.username})

        if "errors" in result or not result.get("data"):
            return None

        repo = result["data"]["user"]["repository"]
        if repo and repo.get("object"):
            return repo["object"].get("text")
        return None

    def _calculate_language_percentages(self, repos: List[Dict]) -> Dict[str, float]:
        """Calculate overall language percentages across all repos."""
        language_sizes: Dict[str, int] = {}
        total_size = 0

        for repo in repos:
            if not repo.get("languages"):
                continue
            for edge in repo["languages"].get("edges", []):
                lang_name = edge["node"]["name"]
                size = edge["size"]
                language_sizes[lang_name] = language_sizes.get(lang_name, 0) + size
                total_size += size

        if total_size == 0:
            return {}

        return {
            lang: round((size / total_size) * 100, 1)
            for lang, size in language_sizes.items()
        }

    def _extract_certifications(
        self, readme_text: Optional[str], repos: List[Dict]
    ) -> List[str]:
        """Detect certifications mentioned in README or repo names."""
        certifications = []

        # Common certification keywords
        cert_keywords = [
            "AWS Certified",
            "Azure Certified",
            "GCP Certified",
            "Google Certified",
            "Certified Kubernetes",
            "CKA",
            "CKAD",
            "AWS Solutions Architect",
            "AWS Developer",
            "AWS SysOps",
            "Microsoft Certified",
            "Oracle Certified",
            "CompTIA",
            "CCNA",
            "CCNP",
            "PMP",
            "Scrum Master",
            "CSM",
        ]

        text_to_search = readme_text or ""

        # Also search in repo names and descriptions
        for repo in repos:
            text_to_search += f" {repo.get('name', '')} {repo.get('description', '')}"

        for keyword in cert_keywords:
            if keyword.lower() in text_to_search.lower():
                certifications.append(keyword)

        return list(set(certifications))

    def _calculate_contribution_stats(self, user_data: Dict) -> ContributionStats:
        """Calculate contribution statistics from user data."""
        contributions = user_data.get("contributionsCollection", {})

        # Calculate streak from contribution calendar
        calendar = contributions.get("contributionCalendar", {})
        weeks = calendar.get("weeks", [])

        streak = 0
        for week in reversed(weeks):
            for day in reversed(week.get("contributionDays", [])):
                if day.get("contributionCount", 0) > 0:
                    streak += 1
                else:
                    break
            if streak == 0:
                break

        # Count commits in last 90 days (approximation from calendar)
        commits_90d = 0
        cutoff_date = datetime.now() - timedelta(days=90)

        for week in weeks:
            for day in week.get("contributionDays", []):
                day_date = datetime.fromisoformat(day["date"].replace("Z", "+00:00"))
                if day_date > cutoff_date:
                    commits_90d += day.get("contributionCount", 0)

        return ContributionStats(
            total_commits_last_90d=commits_90d,
            contribution_streak=streak,
            total_prs=user_data.get("pullRequests", {}).get("totalCount", 0),
            total_issues=user_data.get("issues", {}).get("totalCount", 0),
            total_reviews=contributions.get("totalPullRequestReviewContributions", 0),
        )

    async def build_summary(self) -> GitHubSummary:
        """Build complete GitHub profile summary."""
        # Fetch data concurrently
        profile_task = self.fetch_user_profile()
        readme_task = self.fetch_readme()

        user_data, readme_content = await asyncio.gather(profile_task, readme_task)

        repos = user_data.get("repositories", {}).get("nodes", [])
        public_repos = [r for r in repos if not r.get("isPrivate", False)]

        # Build top repos list
        top_repos = []
        for repo in sorted(
            public_repos, key=lambda x: x.get("stargazerCount", 0), reverse=True
        )[:5]:
            last_commit = None
            if repo.get("defaultBranchRef") and repo["defaultBranchRef"].get("target"):
                history = (
                    repo["defaultBranchRef"]["target"]
                    .get("history", {})
                    .get("nodes", [])
                )
                if history:
                    last_commit = history[0].get("committedDate")

            topics = [
                t["topic"]["name"]
                for t in repo.get("repositoryTopics", {}).get("nodes", [])
            ]

            top_repos.append(
                RepoInfo(
                    name=repo.get("name", ""),
                    description=repo.get("description"),
                    stars=repo.get("stargazerCount", 0),
                    forks=repo.get("forkCount", 0),
                    topics=topics,
                    language=repo.get("primaryLanguage", {}).get("name")
                    if repo.get("primaryLanguage")
                    else None,
                    last_commit=last_commit,
                    is_private=repo.get("isPrivate", False),
                )
            )

        # Calculate languages
        languages = self._calculate_language_percentages(repos)

        # Extract certifications
        certifications = self._extract_certifications(readme_content, repos)

        # Calculate contribution stats
        contribution_stats = self._calculate_contribution_stats(user_data)

        # Truncate README excerpt
        readme_excerpt = None
        if readme_content:
            readme_excerpt = (
                readme_content[:2000] + "..."
                if len(readme_content) > 2000
                else readme_content
            )

        return GitHubSummary(
            username=user_data.get("login", self.username),
            total_repos=user_data.get("repositories", {}).get("totalCount", 0),
            public_repos=len(public_repos),
            followers=user_data.get("followers", {}).get("totalCount", 0),
            following=user_data.get("following", {}).get("totalCount", 0),
            bio=user_data.get("bio"),
            company=user_data.get("company"),
            location=user_data.get("location"),
            languages=languages,
            top_repos=top_repos,
            contribution_stats=contribution_stats,
            readme_excerpt=readme_excerpt,
            certifications_detected=certifications,
            last_updated=datetime.utcnow(),
        )


async def get_github_summary() -> GitHubSummary:
    """Convenience function to get GitHub summary with default settings."""
    client = GitHubClient()
    return await client.build_summary()
