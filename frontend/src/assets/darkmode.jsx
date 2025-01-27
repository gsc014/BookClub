import React, { useState } from "react";
import Toggle from "react-toggle";

export const DarkModeToggle = () => {
    const [isDark, setIsDark] = useState(false);

    useEffect(() => {
        if (isDark) {
            document.body.classList.add('dark');
        } else {
            document.body.classList.remove('dark');
        }
    }, [isDark]);


    return (
        <Toggle
            checked={isDark}
            onChange={({ target }) => setIsDark(target.checked)}
            icons={{ checked: "🌙", unchecked: "🔆" }}
            aria-label="Dark mode toggle"
        />
    );
};