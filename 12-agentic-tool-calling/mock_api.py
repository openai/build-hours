from typing import List, Dict, Optional, Any


class MockAPIError(RuntimeError):
    """Generic recoverable API error."""


class MockAPI:
    """
    In‑memory store that implements the ten calls the demo agent uses.
    A few “bumps” are hard‑coded to force the agent to reason and retry.
    """

    # ------------------------------------------------------------------ bootstrap
    def __init__(self):
        # Policies
        self.policies: List[Dict[str, Any]] = [
            {
                "id": 1,
                "title": "Refund & Credit Policy",
                "content": "Full refund for duplicate charges within 5 business days.",
            },
            {
                "id": 2,
                "title": "SLA – Dashboard Availability",
                "content": "99.9 % uptime; credits after 15 min outage.",
            },
            {
                "id": 3,
                "title": "Export Feature Limits",
                "content": "CSV export capped at 50 MB; async processing above that.",
            },
        ]

        # Runbooks
        self.documents: List[Dict[str, Any]] = [
            {
                "id": 101,
                "title": "Billing Incident Playbook",  # category intentionally *missing*
                "content": "Steps for duplicate‑charge issues …",
                "comments": [],
            },
            {
                "id": 102,
                "title": "Product Export Error Playbook",
                "category": "product",
                "content": "Checklist for export bugs …",
                "comments": [],
            },
            {
                "id": 103,
                "title": "Service Downtime Playbook",
                "category": "service",
                "content": "Log collection / RCA …",
                "comments": [],
            },
        ]

        # Tickets
        self.tickets: List[Dict[str, Any]] = [
            {
                "id": 1,
                "title": "Customer charged twice",
                "description": "Duplicate Stripe charge on subscription plan.",
                "status": "open",
                "comments": [],
            },
            {
                "id": 2,
                "title": "Export CSV missing rows",
                "description": "Rows >‑50 MB are truncated.",
                "status": "open",
                "comments": [],
            },
            {
                "id": 3,
                "title": "Dashboard 500 errors (08:15‑08:40)",
                "description": "Intermittent 500s observed by users.",
                "status": "open",
                "comments": [],
            },
        ]

        # Emails
        self.emails: List[Dict[str, Any]] = [
            {
                "id": 1,
                "from": "jane.smith@example.com",
                "to": "support@example.com",
                "subject": "TechStart – duplicate charge screenshots",
                "body": "See attachments …",
            }
        ]

    # ------------------------------------------------------------------ helpers
    @staticmethod
    def _simple_match(q: str, text: str) -> bool:
        return q.lower() in text.lower()

    # ------------------------------------------------------------------ 1. search_open_tickets
    def search_open_tickets(self, query: str) -> List[Dict[str, Any]]:
        # Bump: overly long / fuzzy queries return nothing.
        if len(query.split()) > 6:
            return []
        return [
            t
            for t in self.tickets
            if t["status"] == "open"
            and (
                self._simple_match(query, t["title"])
                or self._simple_match(query, t["description"])
            )
        ]

    # ------------------------------------------------------------------ 2. runbook helpers
    def get_runbook_by_category(self, category: str) -> Optional[Dict[str, Any]]:
        # Bump: 'billing' is missing category metadata, so returns None.
        return next((d for d in self.documents if d.get("category") == category), None)

    def read_document(self, doc_id: int) -> Optional[Dict[str, Any]]:
        return next((d for d in self.documents if d["id"] == doc_id), None)

    # ------------------------------------------------------------------ 3. search_policies
    def search_policies(self, query: str) -> List[Dict[str, Any]]:
        return [
            p
            for p in self.policies
            if self._simple_match(query, p["title"])
            or self._simple_match(query, p["content"])
        ]

    # ------------------------------------------------------------------ 4. get_emails
    def get_emails(self, to: Optional[str] = None) -> List[Dict[str, Any]]:
        if to:
            return [e for e in self.emails if e["to"] == to]
        return self.emails.copy()

    # ------------------------------------------------------------------ 5. add_ticket_comment
    def add_ticket_comment(self, ticket_id: int, comment: str) -> Optional[List[str]]:
        ticket = next((t for t in self.tickets if t["id"] == ticket_id), None)
        if ticket:
            ticket["comments"].append(comment)
            return ticket["comments"]
        # Bump: wrong ID – return None to signal “not found”.
        return None

    # ------------------------------------------------------------------ 6. write_document
    def write_document(
        self, title: str, content: str, doc_id: Optional[int] = None
    ) -> Dict[str, Any]:
        # Bump: doc_id == 1 simulates a locked file.
        if doc_id == 101:
            raise MockAPIError("Document locked for editing.")
        if doc_id:
            doc = next((d for d in self.documents if d["id"] == doc_id), None)
            if doc:
                doc.update({"title": title, "content": content})
                return doc
        # create new
        new_id = max(d["id"] for d in self.documents) + 1
        doc = {"id": new_id, "title": title, "content": content, "comments": []}
        self.documents.append(doc)
        return doc

    # ------------------------------------------------------------------ 7/8. send_email
    def send_email(
        self, from_addr: str, to_addr: str, subject: str, body: str
    ) -> Dict[str, Any]:
        # Bump: obvious bad address gives recoverable error.
        if "billing@techstart" in to_addr:
            raise MockAPIError("550 recipient address not found")
        new_id = max((e["id"] for e in self.emails), default=0) + 1
        email = {
            "id": new_id,
            "from": from_addr,
            "to": to_addr,
            "subject": subject,
            "body": body,
        }
        self.emails.append(email)
        return email
