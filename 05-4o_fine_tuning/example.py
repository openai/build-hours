# System Message
SYSTEM_MSG = """
You are an AI assistant specialized in fixing code vulnerabilities. 
Your task is to provide corrected code that addresses the reported security issue.
Always maintain the original functionality while improving security. 
Be precise and make only necessary changes. 
Maintain the original code style and formatting unless it directly relates to the vulnerability. 
Pay attention to data flow between sources and sinks when provided.
"""

# User Message (Partial code to show an example)
USER_MSG = """
Vulnerability Report:
- Type: CWE-668
- Location: lines 54
- Description: The application is configured to run on host '0.0.0.0', which exposes it to all network interfaces, potentially allowing unauthorized access from external networks. 
This violates the principle of least privilege and may lead to security risks.

Original Code:

import aioredis
import sqlite3
import logging
import json
import asyncio
from sanic import Sanic, response
from sanic.log import logger
from sanic_jwt import Initialize, protected
from datetime import datetime

class CustomException(Exception):
    pass

class AnalyticsApp:
    def __init__(self):
        self.redis = None
        self.db = None
        self.app = Sanic("AnalyticsApp")
        Initialize(self.app, authenticate=self.authenticate)
        self.setup_routes()
        self.setup_logging()

    async def setup_redis(self):
        try:
            self.redis = await aioredis.create_redis_pool('redis://localhost')
            logger.info("Redis connection established")
        except Exception as e:
            logger.error(f"Redis connection failed: {str(e)}")
            raise CustomException("Redis connection failed")

    def setup_database(self):
        try:
            self.db = sqlite3.connect('users.db')
            cursor = self.db.cursor()
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS users
                (id INTEGER PRIMARY KEY, username TEXT UNIQUE, password TEXT, created_at TIMESTAMP)
            ''')
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS events
                (id INTEGER PRIMARY KEY, user_id INTEGER, event_type TEXT, event_data TEXT, timestamp TIMESTAMP)
            ''')
            self.db.commit()
            logger.info("Database setup completed")
        except sqlite3.Error as e:
            logger.error(f"Database setup failed: {str(e)}")
            raise CustomException("Database setup failed")

...
"""

# Assistant Message (Partial code to show an example)
ASSISTANT_MSG = """
import aioredis
import sqlite3
import logging
from sanic import Sanic, response
from sanic.log import logger
from sanic_jwt import Initialize, protected

class AnalyticsApp:
    def __init__(self):
        self.redis = None
        self.db = None
        self.app = Sanic("AnalyticsApp")
        Initialize(self.app, authenticate=self.authenticate)
        self.setup_routes()
        self.setup_logging()

    async def setup_redis(self):
        self.redis = await aioredis.create_redis_pool('redis://localhost')

...
"""
