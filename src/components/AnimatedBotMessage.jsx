import React, { useState, useEffect, useRef } from 'react';

const AnimatedBotMessage = ({ htmlContent, onAnimationComplete }) => {
    const [displayedContent, setDisplayedContent] = useState('');
    const [isTyping, setIsTyping] = useState(true);
    const [hasNumberedList, setHasNumberedList] = useState(false);
    const timeoutRef = useRef(null);
    const hasAnimatedRef = useRef(false);
    const currentContentRef = useRef('');

    useEffect(() => {
        // If this is the same content and we've already animated, don't animate again
        if (currentContentRef.current === htmlContent && hasAnimatedRef.current) {
            setDisplayedContent(htmlContent);
            setIsTyping(false);
            return;
        }

        // New content - reset animation state
        if (currentContentRef.current !== htmlContent) {
            hasAnimatedRef.current = false;
            currentContentRef.current = htmlContent;
        }

        // Clear any existing timeout
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }

        // Check if content contains proper numbered lists (both English and Arabic numerals)
        const numberedListPattern = /^[\d١-٩]+\.\s/m;
        const matches = htmlContent.match(numberedListPattern);
        const containsNumberedList = matches && matches.length >= 2;
        
        setHasNumberedList(containsNumberedList);

        // If it's a numbered list, show immediately with CSS animation
        if (containsNumberedList) {
            setIsTyping(false);
            setDisplayedContent(htmlContent);
            hasAnimatedRef.current = true;
            if (onAnimationComplete) {
                setTimeout(() => onAnimationComplete(), 100);
            }
            return;
        }

        // Reset state for new content (normal text)
        setDisplayedContent('');
        setIsTyping(true);

        // Create a temporary div to parse HTML and extract text
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = htmlContent;
        const textContent = tempDiv.textContent || tempDiv.innerText || '';

        let currentIndex = 0;
        const typeSpeed = 30; // milliseconds per character

        // Helper function to apply basic formatting during typing
        const applyBasicFormatting = (text) => {
            return text
                .replace(/\n/g, '<br>'); // Only convert line breaks to <br>, no paragraph tags
        };

        const typeWriter = () => {
            if (currentIndex < textContent.length) {
                const currentText = textContent.substring(0, currentIndex + 1);
                const basicFormatted = applyBasicFormatting(currentText);
                setDisplayedContent(basicFormatted);
                currentIndex++;
                timeoutRef.current = setTimeout(typeWriter, typeSpeed);
            } else {
                // When typing is complete, show the full HTML content
                setIsTyping(false);
                setDisplayedContent(htmlContent);
                hasAnimatedRef.current = true;
                if (onAnimationComplete) {
                    onAnimationComplete();
                }
            }
        };

        // Start typing after a small delay
        timeoutRef.current = setTimeout(typeWriter, 100);

        // Cleanup function
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, [htmlContent]); // Remove onAnimationComplete from dependencies

    if (hasNumberedList) {
        // For numbered lists, show immediately with CSS fade-in animation
        return (
            <div
                className="list-fade-in"
                dangerouslySetInnerHTML={{ __html: displayedContent }}
            />
        );
    } else if (isTyping) {
        // While typing normal text, show basic formatted content
        return (
            <div className="typing-animation">
                <span dangerouslySetInnerHTML={{ __html: displayedContent }} />
                <span className="typing-cursor">|</span>
            </div>
        );
    } else {
        // When typing is complete, show full HTML content
        return (
            <div
                className="typed-complete"
                dangerouslySetInnerHTML={{ __html: displayedContent }}
            />
        );
    }
};

export default AnimatedBotMessage;