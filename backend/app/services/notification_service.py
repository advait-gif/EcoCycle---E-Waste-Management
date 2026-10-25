"""
Notification service — in-app + extensible for email/SMS.
"""
import logging
from sqlalchemy.orm import Session

from app.models.models import Notification, NotificationChannel

logger = logging.getLogger(__name__)


def send_notification(
    db: Session,
    user_id: str,
    title: str,
    body: str,
    channel: NotificationChannel = NotificationChannel.IN_APP,
    reference_type: str | None = None,
    reference_id: str | None = None,
) -> Notification:
    notif = Notification(
        user_id=user_id,
        channel=channel,
        title=title,
        body=body,
        reference_type=reference_type,
        reference_id=reference_id,
    )
    db.add(notif)
    db.flush()

    if channel == NotificationChannel.EMAIL:
        # TODO: plug in Resend / SES
        logger.info("[EMAIL stub] To %s: %s", user_id, title)
    elif channel == NotificationChannel.SMS:
        # TODO: plug in MSG91
        logger.info("[SMS stub] To %s: %s", user_id, body)

    return notif
