import { load } from '@cashfreepayments/cashfree-js';

const PaymentButton = ({ sessionData, onPaymentStart }) => {
    const handlePay = async () => {
        if (!sessionData || !sessionData.payment_session_id) {
            alert("Payment session not initialized.");
            return;
        }

        if (onPaymentStart) onPaymentStart();

        try {
            const cashfree = await load({ mode: "sandbox" }); 
            cashfree.checkout({
                paymentSessionId: sessionData.payment_session_id,
                redirectTarget: "_self", 
                returnUrl: window.location.origin + `/payment-status?order_id=${sessionData.order_id}`
            });
        } catch (err) {
            console.error(err);
            alert("Failed to launch payment SDK");
        }
    };

    return (
        <button className="btn px-6 py-2" onClick={handlePay}>
            Proceed to Payment
        </button>
    );
};

export default PaymentButton;