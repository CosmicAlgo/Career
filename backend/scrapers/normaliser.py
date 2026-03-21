"""
CareerRadar - Job Normaliser
Converts RawJobListing to NormalisedJob
"""

import re
import hashlib
from typing import List, Optional, Set
from datetime import date, datetime, timedelta

from scrapers.base_scraper import RawJobListing
from api.schemas import NormalisedJob


class JobNormaliser:
    """Normalises raw job listings to standard format."""
    
    # Common skills to extract
    TECH_SKILLS = {
        "python", "javascript", "typescript", "java", "go", "golang", "rust", "c++", "c#",
        "ruby", "php", "scala", "kotlin", "swift", "r", "matlab",
        "react", "vue", "angular", "svelte", "next.js", "nuxt", "django", "flask",
        "fastapi", "spring", "rails", "laravel", "express", "nodejs", "node.js",
        "aws", "azure", "gcp", "google cloud", "terraform", "kubernetes", "k8s",
        "docker", "jenkins", "gitlab ci", "github actions", "circleci", "travis",
        "mysql", "postgresql", "postgres", "mongodb", "redis", "elasticsearch",
        "spark", "hadoop", "kafka", "airflow", "mlflow", "tensorflow", "pytorch",
        "scikit-learn", "sklearn", "pandas", "numpy", "jupyter", "ml", "machine learning",
        "deep learning", "nlp", "computer vision", "cv", "data science", "ai",
        "linux", "unix", "bash", "shell", "git", "github", "gitlab", "rest api",
        "graphql", "grpc", "protobuf", "microservices", "serverless", "lambda",
        "s3", "ec2", "rds", "cloudformation", "pulumi", "ansible", "puppet", "chef",
        "prometheus", "grafana", "datadog", "new relic", "splunk", "elk",
        "kafka", "rabbitmq", "sqs", "pub/sub", "event-driven", "etl", "elt",
        "snowflake", "bigquery", "redshift", "databricks", "dbt"
    }
    
    SENIORITY_PATTERNS = {
        "junior": ["junior", "jr", "entry level", "entry-level", "graduate", "intern"],
        "mid": ["mid", "intermediate", "associate"],
        "senior": ["senior", "sr", "lead", "principal", "staff", "architect"],
        "manager": ["manager", "head of", "director", "vp", "cto", "chief"]
    }
    
    @classmethod
    def generate_id(cls, title: str, company: Optional[str], posted_date: Optional[date]) -> str:
        """Generate unique job ID from title, company, and date."""
        key = f"{title or ''}|{company or ''}|{posted_date.isoformat() if posted_date else ''}"
        return hashlib.sha256(key.encode()).hexdigest()[:16]
    
    @classmethod
    def normalise(cls, raw: RawJobListing) -> NormalisedJob:
        """Convert RawJobListing to NormalisedJob."""
        # Extract salary range
        salary_min, salary_max, currency = cls._parse_salary(raw.salary_text)
        
        # Extract skills
        all_text = f"{raw.title or ''} {raw.description or ''}"
        required_skills, nice_to_have = cls._extract_skills(all_text)
        
        # Determine seniority
        seniority = cls._detect_seniority(all_text)
        
        # Determine remote status
        remote = cls._detect_remote(raw.location, raw.remote, all_text)
        
        # Parse posted date
        posted_date = cls._normalise_date(raw.posted_at)
        
        return NormalisedJob(
            id=cls.generate_id(raw.title, raw.company, posted_date),
            title=cls._clean_text(raw.title) or "Unknown",
            company=cls._clean_text(raw.company),
            location=cls._clean_text(raw.location),
            remote=remote,
            required_skills=list(required_skills),
            nice_to_have=list(nice_to_have),
            seniority=seniority,
            salary_min=salary_min,
            salary_max=salary_max,
            currency=currency,
            source=raw.source,
            url=raw.url,
            posted_date=posted_date
        )
    
    @classmethod
    def normalise_many(cls, raw_jobs: List[RawJobListing]) -> List[NormalisedJob]:
        """Normalise multiple job listings, removing duplicates."""
        seen_ids: Set[str] = set()
        normalised: List[NormalisedJob] = []
        
        for raw in raw_jobs:
            try:
                job = cls.normalise(raw)
                if job.id not in seen_ids:
                    seen_ids.add(job.id)
                    normalised.append(job)
            except Exception as e:
                print(f"[Normaliser] Failed to normalise job: {e}")
                continue
        
        return normalised
    
    @classmethod
    def _parse_salary(
        cls,
        salary_text: Optional[str]
    ) -> tuple[Optional[int], Optional[int], str]:
        """Parse salary text into min/max values."""
        if not salary_text:
            return None, None, "GBP"
        
        text = salary_text.lower()
        
        # Detect currency
        currency = "GBP"
        if "$" in text or "usd" in text:
            currency = "USD"
        elif "€" in text or "eur" in text:
            currency = "EUR"
        
        # Extract numbers
        numbers = re.findall(r'[\d,]+(?:\.\d+)?[kK]?', text)
        values = []
        
        for num in numbers:
            num = num.replace(",", "").replace("k", "000").replace("K", "000")
            try:
                val = float(num)
                # Assume annual salary (adjust if hourly found)
                if "hour" in text or "hr" in text:
                    val = val * 2080  # ~52 weeks * 40 hours
                elif "day" in text or "daily" in text:
                    val = val * 260  # ~52 weeks * 5 days
                values.append(int(val))
            except ValueError:
                continue
        
        if len(values) >= 2:
            return min(values), max(values), currency
        elif len(values) == 1:
            return values[0], values[0], currency
        
        return None, None, currency
    
    @classmethod
    def _extract_skills(cls, text: str) -> tuple[Set[str], Set[str]]:
        """Extract technical skills from text."""
        if not text:
            return set(), set()
        
        text_lower = text.lower()
        words = set(re.findall(r'\b\w+\b', text_lower))
        
        # Required skills appear in title or early in description
        required: Set[str] = set()
        nice_to_have: Set[str] = set()
        
        for skill in cls.TECH_SKILLS:
            skill_lower = skill.lower()
            # Check if skill appears in text
            if skill_lower in text_lower:
                # Required if mentioned multiple times or in key sections
                count = text_lower.count(skill_lower)
                if count >= 2 or "required" in text_lower or "must have" in text_lower:
                    required.add(skill)
                else:
                    nice_to_have.add(skill)
        
        return required, nice_to_have
    
    @classmethod
    def _detect_seniority(cls, text: str) -> Optional[str]:
        """Detect seniority level from text."""
        if not text:
            return None
        
        text_lower = text.lower()
        
        for level, patterns in cls.SENIORITY_PATTERNS.items():
            for pattern in patterns:
                if pattern in text_lower:
                    return level
        
        return None
    
    @classmethod
    def _detect_remote(
        cls,
        location: Optional[str],
        remote_flag: Optional[bool],
        text: str
    ) -> bool:
        """Detect if job is remote."""
        if remote_flag is not None:
            return remote_flag
        
        if location:
            loc_lower = location.lower()
            if "remote" in loc_lower or "work from home" in loc_lower or "wfh" in loc_lower:
                return True
        
        text_lower = text.lower()
        remote_indicators = [
            "remote", "work from home", "wfh", "fully remote", "100% remote",
            "distributed team", "anywhere", "worldwide"
        ]
        
        return any(indicator in text_lower for indicator in remote_indicators)
    
    @classmethod
    def _normalise_date(cls, posted_at: Optional[datetime]) -> Optional[date]:
        """Normalise posted date."""
        if posted_at:
            return posted_at.date()
        return date.today()
    
    @classmethod
    def _clean_text(cls, text: Optional[str]) -> Optional[str]:
        """Clean and normalise text."""
        if not text:
            return None
        
        # Remove extra whitespace
        cleaned = " ".join(text.split())
        
        # Remove HTML entities
        cleaned = cleaned.replace("&amp;", "&")
        cleaned = cleaned.replace("&lt;", "<")
        cleaned = cleaned.replace("&gt;", ">")
        cleaned = cleaned.replace("&quot;", '"')
        
        return cleaned.strip() if cleaned else None
