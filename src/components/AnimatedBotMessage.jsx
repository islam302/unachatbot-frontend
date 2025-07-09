import React, { useEffect } from 'react';

const AnimatedBotMessage = ({ htmlContent, messagesEndRef }) => {
    // This effect ensures we scroll down as the message container appears
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messagesEndRef]);

    return (
        <>
        <div
            className="staggered-animation-container"
            dangerouslySetInnerHTML={{ __html: htmlContent }}
        />
            <div ref={messagesEndRef} />

        </>
    );
};

export default AnimatedBotMessage;