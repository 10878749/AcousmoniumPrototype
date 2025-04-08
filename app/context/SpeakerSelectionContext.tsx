// app/context/SpeakerSelectionContext.tsx
import React, { createContext, useState, FC, ReactNode, Dispatch, SetStateAction } from 'react';

interface SpeakerSelectionContextProps {
    selectedSpeakers: string[];
    setSelectedSpeakers: Dispatch<SetStateAction<string[]>>;  // 修改类型
}

export const SpeakerSelectionContext = createContext<SpeakerSelectionContextProps>({
    selectedSpeakers: [],
    setSelectedSpeakers: () => {},
});

interface SpeakerSelectionProviderProps {
    children: ReactNode;
}

export const SpeakerSelectionProvider: FC<SpeakerSelectionProviderProps> = ({ children }) => {
    const [selectedSpeakers, setSelectedSpeakers] = useState<string[]>([]);

    return (
        <SpeakerSelectionContext.Provider value={{ selectedSpeakers, setSelectedSpeakers }}>
            {children}
        </SpeakerSelectionContext.Provider>
    );
};
