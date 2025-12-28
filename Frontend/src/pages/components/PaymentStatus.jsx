import { useEffect, useState, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import API from '../../api';
import Loading from './Loading';

const PaymentStatus = () => {
    const [params] = useSearchParams();
    const orderId = params.get("order_id");
    const navigate = useNavigate();
    
    // UI States
    const [statusText, setStatusText] = useState("Verifying Payment...");
    const [statusSubText, setStatusSubText] = useState("Please wait while we confirm with your bank...");
    const [verifiedUid, setVerifiedUid] = useState(null);
    const [isFinished, setIsFinished] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false); 

    const intervalRef = useRef(null);
    const timeoutRef = useRef(null);

    // CONFIG: How long to wait before giving up? (e.g., 60 Seconds)
    const POLLING_TIMEOUT = 15000; 

    useEffect(() => {
        if (!orderId) return;

        // 1. Start Polling Loop
        intervalRef.current = setInterval(checkStatus, 2000);

        // 2. Start Timeout Timer
        timeoutRef.current = setTimeout(() => {
            handleTimeout();
        }, POLLING_TIMEOUT);

        // Cleanup
        return () => {
            clearInterval(intervalRef.current);
            clearTimeout(timeoutRef.current);
        };
    }, [orderId]);

    const stopPolling = () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };

    const handleTimeout = () => {
        stopPolling();
        setStatusText("⏳ Payment Pending");
        setStatusSubText("The bank is taking longer than usual. You can safely close this window. We will update your Dashboard automatically once the payment clears.");
        setIsFinished(true);
        setIsSuccess(false); // Neutral/Yellow style
    };

    const checkStatus = async () => {
        try {
            const { data } = await API.get(`/payment/status/${orderId}`);
            
            // ALWAYS save UID if present (so we know where to redirect)
            if (data.uid) setVerifiedUid(data.uid);


            if (data.status === 'PAID') {
                stopPolling();
                setStatusText("✅ Payment Successful!");
                setStatusSubText("Take a screenshot of this page.");
                setIsFinished(true);
                setIsSuccess(true);
                //setTimeout(() => navigate('/dashboard', { state: { uid: data.uid } }), 15000);
            } 
            else if (['FAILED', 'CANCELLED', 'USER_DROPPED'].includes(data.status)) {
                stopPolling();
                setStatusText("❌ Payment Failed");
                setStatusSubText("The transaction was declined or cancelled.");
                setIsFinished(true);
                setIsSuccess(false);
            }

        } catch (e) {
            console.error("Polling Error", e);
        }
    };

    const handleGoHome = () => {
        let targetUID = verifiedUid;

        if(!targetUID) {
            // Try to get from session storage as fallback
            const storedUID = sessionStorage.getItem("active_user_uid");
            if (storedUID) targetUID = storedUID;
        }

        if (targetUID) {
            navigate('/dashboard', { state: { uid: targetUID } });
        } else {
            navigate('/');
        }
    };

    // If still verifying, show the full Loading Screen
    if (!isFinished) {
        return <Loading message={statusText} />;
    }

    // If Finished (Success/Fail/Timeout), show the Result Card
    return (
        <div style={{ 
            height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', 
            flexDirection: 'column', background: '#121212', color: 'white', padding: '20px', textAlign: 'center' 
        }}>
            <h2 style={{ fontSize: '2rem', marginBottom: '10px', color: isSuccess ? '#4ade80' : 'white' }}>
                {statusText}
            </h2>
            <p style={{ color: '#888', marginBottom: '30px', maxWidth: '400px' }}>
                {statusSubText}
            </p>
            
            <button 
                className="btn" 
                onClick={handleGoHome}
                style={{ 
                    border: 'none', padding: '12px 24px', borderRadius: '8px', cursor: 'pointer', fontSize: '1rem', maxWidth: '200px'
                }}
            >
                {verifiedUid ? "Return to Dashboard" : "Return Home"}
            </button>
            
            <div style={{ marginTop: '20px', fontSize: '0.8rem', color: '#444' }}>Order ID: {orderId}</div>
        </div>
    );
};

export default PaymentStatus;