import hmac
import hashlib
import uuid
import logging
from typing import Optional, Tuple, Dict, Any
from app.core.config import settings

logger = logging.getLogger(__name__)

class RazorpayService:
    def __init__(self):
        self.key_id = settings.RAZORPAY_KEY_ID
        self.key_secret = settings.RAZORPAY_KEY_SECRET

    def create_order(self, amount_inr: float, receipt_id: str, notes: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Creates an order with amount converted to paise (INR * 100).
        Works with live Razorpay client if real API credentials are configured,
        or generates a standard Razorpay sandbox order for development testing.
        """
        amount_paise = int(round(amount_inr * 100))
        
        # If real live Razorpay SDK credentials are provided
        if not self.key_id.startswith("rzp_test_arthayog_sample"):
            try:
                import razorpay
                client = razorpay.Client(auth=(self.key_id, self.key_secret))
                order_data = {
                    "amount": amount_paise,
                    "currency": "INR",
                    "receipt": receipt_id,
                    "payment_capture": 1,
                    "notes": notes or {}
                }
                return client.order.create(data=order_data)
            except Exception as e:
                logger.error(f"Razorpay live order error: {e}")
                raise

        # Sandbox / Development deterministic order generation
        order_id = f"order_{uuid.uuid4().hex[:14]}"
        return {
            "id": order_id,
            "entity": "order",
            "amount": amount_paise,
            "amount_paid": 0,
            "amount_due": amount_paise,
            "currency": "INR",
            "receipt": receipt_id,
            "status": "created",
            "attempts": 0,
            "notes": notes or {}
        }

    def verify_payment_signature(self, order_id: str, payment_id: str, signature: str) -> bool:
        """
        Performs genuine HMAC SHA256 signature verification.
        Never trusts client-only success.
        """
        if not order_id or not payment_id or not signature:
            return False

        message = f"{order_id}|{payment_id}".encode("utf-8")
        generated_signature = hmac.new(
            self.key_secret.encode("utf-8"),
            message,
            hashlib.sha256
        ).hexdigest()

        return hmac.compare_digest(generated_signature, signature)

    def generate_sandbox_signature(self, order_id: str, payment_id: str) -> str:
        """
        Generates genuine cryptographic HMAC SHA256 signature for sandbox payments.
        Used for sandbox payments and automated integration tests.
        """
        message = f"{order_id}|{payment_id}".encode("utf-8")
        return hmac.new(
            self.key_secret.encode("utf-8"),
            message,
            hashlib.sha256
        ).hexdigest()

razorpay_service = RazorpayService()
