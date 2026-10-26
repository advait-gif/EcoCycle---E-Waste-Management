"""
API v1 router — assembles all endpoint routers.
"""
from fastapi import APIRouter

from app.api.v1.endpoints import auth, me, customer, collector, recycler, admin, uploads, public

api_router = APIRouter()

api_router.include_router(public.router)
api_router.include_router(auth.router)
api_router.include_router(me.router)
api_router.include_router(customer.router)
api_router.include_router(collector.router)
api_router.include_router(recycler.router)
api_router.include_router(admin.router)
api_router.include_router(uploads.router)
