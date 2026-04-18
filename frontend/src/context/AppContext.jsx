import { createContext, useContext, useState } from "react";

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [generateText, setGenerateText] = useState("");
  const [translatedText, setTranslatedText] = useState("");

  return (
    <AppContext.Provider
      value={{
        generateText,
        setGenerateText,
        translatedText,
        setTranslatedText,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error("useAppContext must be used inside AppProvider");
  }
  return ctx;
}

