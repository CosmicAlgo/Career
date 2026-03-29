"""
CV/Resume Processing Module
Extracts skills, experience, education from PDF CVs and matches against market data
"""

import re
import io
from typing import Dict, List, Any, Optional
from datetime import datetime
from PyPDF2 import PdfReader
from database.supabase_client import supabase_manager


class CVProcessor:
    """Processes CV files and extracts structured information."""

    def __init__(self):
        # Note: spaCy disabled due to Python 3.14 compatibility issues
        # Using regex-based extraction instead
        self.nlp = None
        print(
            "[CVProcessor] Using regex-based extraction (spaCy disabled for Python 3.14 compatibility)"
        )

        # Common skill keywords for tech roles
        self.tech_skills = {
            "languages": [
                "python",
                "javascript",
                "typescript",
                "java",
                "c++",
                "c#",
                "go",
                "rust",
                "swift",
                "kotlin",
            ],
            "frameworks": [
                "react",
                "vue",
                "angular",
                "django",
                "flask",
                "fastapi",
                "spring",
                "node.js",
                "express",
                "next.js",
            ],
            "databases": [
                "postgresql",
                "mysql",
                "mongodb",
                "redis",
                "elasticsearch",
                "sqlite",
                "oracle",
                "sql server",
            ],
            "cloud": [
                "aws",
                "azure",
                "gcp",
                "google cloud",
                "terraform",
                "kubernetes",
                "docker",
                "jenkins",
                "github actions",
            ],
            "ml": [
                "tensorflow",
                "pytorch",
                "scikit-learn",
                "pandas",
                "numpy",
                "jupyter",
                "keras",
                "huggingface",
                "langchain",
            ],
            "tools": [
                "git",
                "linux",
                "ubuntu",
                "docker",
                "kubernetes",
                "nginx",
                "apache",
                "microservices",
                "rest api",
            ],
        }

        # Education level keywords
        self.education_keywords = {
            "phd": ["phd", "doctor of philosophy", "doctorate"],
            "masters": ["master", "m.sc", "msc", "m.eng", "meng", "postgraduate"],
            "bachelors": ["bachelor", "b.sc", "bsc", "b.eng", "beng", "undergraduate"],
            "certifications": [
                "certificate",
                "certification",
                "aws certified",
                "google certified",
            ],
        }

    async def process_cv_file(
        self, file_content: bytes, filename: str
    ) -> Dict[str, Any]:
        """Process uploaded CV file and extract structured information."""
        try:
            # Extract text from PDF
            text = self._extract_text_from_pdf(file_content)

            if not text:
                raise Exception("Could not extract text from PDF")

            # Process the text
            processed_data = self._analyze_cv_text(text)

            # Add metadata
            processed_data.update(
                {
                    "filename": filename,
                    "processed_at": datetime.utcnow().isoformat(),
                    "text_length": len(text),
                }
            )

            return processed_data

        except Exception as e:
            print(f"[CVProcessor] Error processing CV: {e}")
            raise

    def _extract_text_from_pdf(self, file_content: bytes) -> str:
        """Extract text from PDF bytes."""
        try:
            pdf_file = io.BytesIO(file_content)
            reader = PdfReader(pdf_file)

            text = ""
            for page in reader.pages:
                text += page.extract_text() + "\n"

            return text.strip()

        except Exception as e:
            print(f"[CVProcessor] Error extracting PDF text: {e}")
            return ""

    def _analyze_cv_text(self, text: str) -> Dict[str, Any]:
        """Analyze CV text and extract structured information."""
        # Convert to lowercase for matching
        text_lower = text.lower()

        # Extract sections
        sections = self._extract_sections(text)

        # Extract skills
        skills = self._extract_skills(text_lower)

        # Extract experience
        experience = self._extract_experience(sections.get("experience", ""))

        # Extract education
        education = self._extract_education(sections.get("education", ""))

        # Extract contact info
        contact = self._extract_contact_info(text)

        # Calculate CV score
        cv_score = self._calculate_cv_score(skills, experience, education)

        return {
            "skills": skills,
            "experience": experience,
            "education": education,
            "contact": contact,
            "sections": list(sections.keys()),
            "cv_score": cv_score,
            "raw_text": text[:1000] + "..."
            if len(text) > 1000
            else text,  # Store snippet
        }

    def _extract_sections(self, text: str) -> Dict[str, str]:
        """Extract main sections from CV."""
        sections = {}

        # Common section headers
        section_patterns = {
            "experience": r"(?:experience|work experience|employment|professional experience)(.*?)(?:education|skills|projects|$)",
            "education": r"(?:education|academic|qualifications|degrees)(.*?)(?:experience|skills|projects|$)",
            "skills": r"(?:skills|technical skills|competencies|technologies)(.*?)(?:experience|education|projects|$)",
            "projects": r"(?:projects|personal projects|portfolio)(.*?)(?:experience|education|skills|$)",
            "summary": r"(?:summary|profile|about|objective)(.*?)(?:experience|education|skills|projects|$)",
        }

        text_lower = text.lower()

        for section_name, pattern in section_patterns.items():
            match = re.search(pattern, text_lower, re.DOTALL | re.IGNORECASE)
            if match:
                sections[section_name] = match.group(1).strip()

        return sections

    def _extract_skills(self, text: str) -> Dict[str, List[str]]:
        """Extract technical skills from text."""
        found_skills = {}

        for category, skill_list in self.tech_skills.items():
            found = []
            for skill in skill_list:
                # Look for whole word matches
                pattern = r"\b" + re.escape(skill) + r"\b"
                if re.search(pattern, text, re.IGNORECASE):
                    found.append(skill.title())

            if found:
                found_skills[category] = found

        return found_skills

    def _extract_experience(self, experience_text: str) -> List[Dict[str, Any]]:
        """Extract work experience information."""
        experiences = []

        # Look for patterns like: "Company Name - Position (Date to Date)"
        exp_pattern = r"([^-]+?)\s*[-–]\s*([^(]+?)\s*\(([^)]+)\)"

        matches = re.findall(exp_pattern, experience_text)

        for company, position, dates in matches:
            experiences.append(
                {
                    "company": company.strip(),
                    "position": position.strip(),
                    "dates": dates.strip(),
                    "duration": self._parse_duration(dates),
                }
            )

        return experiences

    def _extract_education(self, education_text: str) -> List[Dict[str, Any]]:
        """Extract education information."""
        education = []

        for level, keywords in self.education_keywords.items():
            for keyword in keywords:
                if keyword in education_text.lower():
                    # Try to extract degree and institution
                    # This is a simplified extraction - could be enhanced with NLP
                    education.append(
                        {
                            "level": level,
                            "keyword_found": keyword,
                            "text": education_text[:200] + "..."
                            if len(education_text) > 200
                            else education_text,
                        }
                    )
                    break

        return education

    def _extract_contact_info(self, text: str) -> Dict[str, str]:
        """Extract contact information."""
        contact = {}

        # Email
        email_pattern = r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b"
        email_match = re.search(email_pattern, text)
        if email_match:
            contact["email"] = email_match.group()

        # Phone (simplified pattern)
        phone_pattern = r"(?:\+?44|0)[\d\s-]{10,}"
        phone_match = re.search(phone_pattern, text)
        if phone_match:
            contact["phone"] = phone_match.group()

        # LinkedIn
        linkedin_pattern = r"linkedin\.com/in/[\w-]+"
        linkedin_match = re.search(linkedin_pattern, text, re.IGNORECASE)
        if linkedin_match:
            contact["linkedin"] = "https://" + linkedin_match.group()

        # GitHub
        github_pattern = r"github\.com/[\w-]+"
        github_match = re.search(github_pattern, text, re.IGNORECASE)
        if github_match:
            contact["github"] = "https://" + github_match.group()

        return contact

    def _parse_duration(self, date_string: str) -> Optional[int]:
        """Parse duration from date string and return months."""
        # Simplified duration parsing
        # Could be enhanced with proper date parsing
        if "year" in date_string.lower():
            year_match = re.search(r"(\d+)\s*year", date_string.lower())
            if year_match:
                return int(year_match.group(1)) * 12

        if "month" in date_string.lower():
            month_match = re.search(r"(\d+)\s*month", date_string.lower())
            if month_match:
                return int(month_match.group(1))

        return None

    def _calculate_cv_score(
        self,
        skills: Dict[str, List[str]],
        experience: List[Dict],
        education: List[Dict],
    ) -> Dict[str, Any]:
        """Calculate CV quality and completeness score."""
        score = 0
        max_score = 100
        feedback = []

        # Skills scoring (40 points)
        skills_score = 0

        found_categories = len(skills)

        if found_categories >= 3:
            skills_score = 40
        elif found_categories >= 2:
            skills_score = 30
        elif found_categories >= 1:
            skills_score = 20
        else:
            feedback.append("Add more technical skills to your CV")

        score += skills_score

        # Experience scoring (35 points)
        if len(experience) >= 2:
            score += 35
        elif len(experience) >= 1:
            score += 25
        else:
            feedback.append("Add more work experience details")

        # Education scoring (25 points)
        education_levels = [edu["level"] for edu in education]
        if "phd" in education_levels or "masters" in education_levels:
            score += 25
        elif "bachelors" in education_levels:
            score += 20
        elif "certifications" in education_levels:
            score += 15
        else:
            feedback.append("Add education details to your CV")

        return {
            "total_score": score,
            "max_score": max_score,
            "percentage": (score / max_score) * 100,
            "feedback": feedback,
            "breakdown": {
                "skills": skills_score,
                "experience": 35
                if len(experience) >= 2
                else (25 if len(experience) >= 1 else 0),
                "education": 25
                if "phd" in education_levels or "masters" in education_levels
                else (
                    20
                    if "bachelors" in education_levels
                    else (15 if "certifications" in education_levels else 0)
                ),
            },
        }


class CVMatcher:
    """Matches CV data against market data and job requirements."""

    def __init__(self):
        self.processor = CVProcessor()

    async def analyze_cv_against_market(
        self, cv_data: Dict[str, Any], target_roles: List[str]
    ) -> Dict[str, Any]:
        """Analyze CV against current market data and target roles."""
        try:
            # Get current market data
            market_data = await self._get_market_data(target_roles)

            # Analyze skill gaps
            skill_analysis = self._analyze_skill_gaps(cv_data["skills"], market_data)

            # Compare with GitHub profile (if available)
            github_comparison = await self._compare_with_github(cv_data, target_roles)

            # Generate role-specific scores
            role_scores = self._calculate_role_scores(
                cv_data["skills"], target_roles, market_data
            )

            # Generate improvement suggestions
            suggestions = self._generate_suggestions(
                cv_data, skill_analysis, role_scores
            )

            return {
                "cv_score": cv_data["cv_score"],
                "skill_analysis": skill_analysis,
                "github_comparison": github_comparison,
                "role_scores": role_scores,
                "market_match": self._calculate_market_match(
                    cv_data["skills"], market_data
                ),
                "suggestions": suggestions,
                "analyzed_at": datetime.utcnow().isoformat(),
            }

        except Exception as e:
            print(f"[CVMatcher] Error analyzing CV: {e}")
            raise

    async def _get_market_data(self, target_roles: List[str]) -> Dict[str, Any]:
        """Get current market data for target roles."""
        try:
            # Get latest jobs for target roles
            db = supabase_manager.client

            # Get jobs from last 30 days
            from datetime import date, timedelta

            cutoff_date = (date.today() - timedelta(days=30)).isoformat()

            response = (
                db.table("jobs").select("*").gte("posted_date", cutoff_date).execute()
            )
            jobs = response.data or []

            # Analyze market trends
            market_skills = {}
            role_specific_jobs = {}

            for job in jobs:
                # Extract skills from job description (simplified)
                job_skills = self._extract_job_skills(job.get("description", ""))

                # Count overall skill frequency
                for skill in job_skills:
                    market_skills[skill] = market_skills.get(skill, 0) + 1

                # Group by role
                job_role = job.get("title", "").lower()
                for target_role in target_roles:
                    if (
                        target_role.replace("_", " ") in job_role
                        or target_role in job_role
                    ):
                        if target_role not in role_specific_jobs:
                            role_specific_jobs[target_role] = []
                        role_specific_jobs[target_role].append(job)

            return {
                "total_jobs_analyzed": len(jobs),
                "market_skills": dict(
                    sorted(market_skills.items(), key=lambda x: x[1], reverse=True)[:50]
                ),
                "role_specific_jobs": role_specific_jobs,
                "analysis_period": "30 days",
            }

        except Exception as e:
            print(f"[CVMatcher] Error getting market data: {e}")
            return {
                "total_jobs_analyzed": 0,
                "market_skills": {},
                "role_specific_jobs": {},
            }

    def _extract_job_skills(self, job_description: str) -> List[str]:
        """Extract skills from job description."""
        skills = []
        desc_lower = job_description.lower()

        # Use the same skill categories as CV processor
        processor = CVProcessor()
        for category, skill_list in processor.tech_skills.items():
            for skill in skill_list:
                pattern = r"\b" + re.escape(skill) + r"\b"
                if re.search(pattern, desc_lower, re.IGNORECASE):
                    skills.append(skill.title())

        return list(set(skills))  # Remove duplicates

    def _analyze_skill_gaps(
        self, cv_skills: Dict[str, List[str]], market_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Analyze skill gaps between CV and market."""
        cv_skill_list = []
        for category, skills in cv_skills.items():
            cv_skill_list.extend(skills)

        cv_skill_set = set([s.lower() for s in cv_skill_list])
        market_skills = market_data.get("market_skills", {})

        # Find missing in-demand skills
        missing_skills = []
        for skill, frequency in market_skills.items():
            if (
                skill.lower() not in cv_skill_set and frequency >= 5
            ):  # Skills appearing in 5+ jobs
                missing_skills.append(
                    {
                        "skill": skill,
                        "market_frequency": frequency,
                        "priority": "high"
                        if frequency >= 20
                        else "medium"
                        if frequency >= 10
                        else "low",
                    }
                )

        # Find declining skills (in CV but not in market)
        declining_skills = []
        for skill in cv_skill_list:
            if skill.lower() not in [s.lower() for s in market_skills.keys()]:
                declining_skills.append(skill)

        return {
            "total_cv_skills": len(cv_skill_list),
            "in_demand_skills": len(
                [
                    s
                    for s in cv_skill_list
                    if s.lower() in [ms.lower() for ms in market_skills.keys()]
                ]
            ),
            "missing_skills": sorted(
                missing_skills, key=lambda x: x["market_frequency"], reverse=True
            )[:10],
            "declining_skills": declining_skills[:5],
            "skill_coverage": len(
                [
                    s
                    for s in cv_skill_list
                    if s.lower() in [ms.lower() for ms in market_skills.keys()]
                ]
            )
            / max(len(market_skills), 1)
            * 100,
        }

    async def _compare_with_github(
        self, cv_data: Dict[str, Any], target_roles: List[str]
    ) -> Dict[str, Any]:
        """Compare CV skills with GitHub profile."""
        try:
            # Get user settings to find GitHub username
            db = supabase_manager.client
            settings_response = (
                db.table("user_settings")
                .select("*")
                .order("updated_at", desc=True)
                .limit(1)
                .execute()
            )

            if not settings_response.data:
                return {
                    "github_available": False,
                    "message": "No GitHub username found",
                }

            github_username = settings_response.data[0].get("github_username")
            if not github_username:
                return {
                    "github_available": False,
                    "message": "No GitHub username found",
                }

            # Get GitHub data (simplified - would need GitHub API integration)
            # For now, return placeholder
            return {
                "github_available": True,
                "github_username": github_username,
                "comparison": "GitHub integration pending - would compare languages, repositories, activity",
                "matches": [],
                "discrepancies": [],
            }

        except Exception as e:
            print(f"[CVMatcher] Error comparing with GitHub: {e}")
            return {"github_available": False, "error": str(e)}

    def _calculate_role_scores(
        self,
        cv_skills: Dict[str, List[str]],
        target_roles: List[str],
        market_data: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Calculate CV score for each target role."""
        cv_skill_list = []
        for category, skills in cv_skills.items():
            cv_skill_list.extend(skills)
        cv_skill_set = set([s.lower() for s in cv_skill_list])

        role_scores = {}
        role_jobs = market_data.get("role_specific_jobs", {})

        for role in target_roles:
            jobs = role_jobs.get(role, [])
            if not jobs:
                role_scores[role] = {
                    "score": 0,
                    "matched_skills": [],
                    "missing_skills": [],
                    "total_jobs": 0,
                }
                continue

            # Extract required skills from job descriptions
            all_job_skills = []
            for job in jobs:
                all_job_skills.extend(
                    self._extract_job_skills(job.get("description", ""))
                )

            # Count skill frequencies
            skill_frequency = {}
            for skill in all_job_skills:
                skill_frequency[skill.lower()] = (
                    skill_frequency.get(skill.lower(), 0) + 1
                )

            # Calculate match score
            matched_skills = []
            missing_skills = []

            for skill, freq in sorted(
                skill_frequency.items(), key=lambda x: x[1], reverse=True
            )[:20]:
                if skill in cv_skill_set:
                    matched_skills.append((skill.title(), freq))
                else:
                    missing_skills.append((skill.title(), freq))

            # Score based on percentage of top skills matched
            top_skills_count = min(20, len(skill_frequency))
            matched_count = len(matched_skills)
            score_percentage = (
                (matched_count / top_skills_count) * 100 if top_skills_count > 0 else 0
            )

            role_scores[role] = {
                "score": round(score_percentage, 1),
                "matched_skills": matched_skills[:10],
                "missing_skills": missing_skills[:10],
                "total_jobs": len(jobs),
            }

        return role_scores

    def _calculate_market_match(
        self, cv_skills: Dict[str, List[str]], market_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Calculate overall market match percentage."""
        cv_skill_list = []
        for category, skills in cv_skills.items():
            cv_skill_list.extend(skills)

        market_skills = market_data.get("market_skills", {})
        total_market_jobs = market_data.get("total_jobs_analyzed", 0)

        if total_market_jobs == 0:
            return {"match_percentage": 0, "message": "No market data available"}

        # Calculate how many of CV skills appear in market
        matching_skills = 0
        for skill in cv_skill_list:
            if skill.lower() in [ms.lower() for ms in market_skills.keys()]:
                matching_skills += 1

        match_percentage = (matching_skills / max(len(cv_skill_list), 1)) * 100

        return {
            "match_percentage": round(match_percentage, 1),
            "matching_skills": matching_skills,
            "total_cv_skills": len(cv_skill_list),
            "market_jobs_analyzed": total_market_jobs,
        }

    def _generate_suggestions(
        self,
        cv_data: Dict[str, Any],
        skill_analysis: Dict[str, Any],
        role_scores: Dict[str, Any],
    ) -> List[str]:
        """Generate improvement suggestions based on analysis."""
        suggestions = []

        # Add CV score feedback
        cv_feedback = cv_data["cv_score"].get("feedback", [])
        suggestions.extend(cv_feedback)

        # Add skill gap suggestions
        missing_skills = skill_analysis.get("missing_skills", [])[:5]
        if missing_skills:
            suggestions.append(
                f"Consider adding these in-demand skills: {', '.join([s['skill'] for s in missing_skills])}"
            )

        # Add role-specific suggestions
        low_scoring_roles = [
            role for role, data in role_scores.items() if data["score"] < 50
        ]
        if low_scoring_roles:
            suggestions.append(
                f"Your CV needs improvement for: {', '.join(low_scoring_roles)}"
            )

        # Add positive feedback
        high_scoring_roles = [
            role for role, data in role_scores.items() if data["score"] >= 70
        ]
        if high_scoring_roles:
            suggestions.append(f"Strong match for: {', '.join(high_scoring_roles)}")

        return suggestions


# Singleton instances
cv_processor = CVProcessor()
cv_matcher = CVMatcher()
