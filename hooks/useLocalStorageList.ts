import { useCallback } from 'react';
import useLocalStorage from './useLocalStorage';

function useLocalStorageList<T extends { id: string }>(key: string, initialValue: T[] = []) {
    const [items, setItems] = useLocalStorage<T[]>(key, initialValue);

    const addItem = useCallback((item: T) => {
        setItems(prev => [...prev, item]);
    }, [setItems]);

    const updateItem = useCallback((id: string, updater: (current: T) => T) => {
        setItems(prev => prev.map(item => (item.id === id ? updater(item) : item)));
    }, [setItems]);

    const removeItem = useCallback((id: string | ((current: T) => boolean)) => {
        if (typeof id === 'function') {
            setItems(prev => prev.filter(item => !id(item)));
        } else {
            setItems(prev => prev.filter(item => item.id !== id));
        }
    }, [setItems]);

    return {
        items,
        setItems,
        addItem,
        updateItem,
        removeItem,
    } as const;
}

export default useLocalStorageList;
