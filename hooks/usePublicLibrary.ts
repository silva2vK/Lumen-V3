
import { useState, useCallback, useEffect } from 'react';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { db } from '../components/firebaseClient';
import type { Module } from '../types';

export function usePublicLibrary() {
    const [searchedModules, setSearchedModules] = useState<Module[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    
    // Default filters
    const [moduleFilters, setModuleFilters] = useState({
        queryText: '',
        serie: 'all',
        materia: 'all',
        status: 'all',
        scope: 'public'
    });

    const searchModules = useCallback(async (filters: typeof moduleFilters) => {
        setIsLoading(true);
        setModuleFilters(filters);
        
        try {
            // Base constraints for public library
            let constraints = [
                where("status", "==", "Ativo"),
                where("visibility", "==", "public")
            ];

            // Server-side filtering for indexed fields
            if (filters.materia !== 'all') {
                constraints.push(where("materia", "==", filters.materia));
            }

            const q = query(collection(db, "modules"), ...constraints, limit(50));
            const snap = await getDocs(q);
            let results = snap.docs.map(d => ({ id: d.id, ...d.data() } as Module));

            // Client-side filtering for flexible fields
            if (filters.serie !== 'all') {
                results = results.filter(m => {
                    const s = Array.isArray(m.series) ? m.series : [m.series];
                    return s.includes(filters.serie);
                });
            }

            // Text search
            if (filters.queryText) {
                const lower = filters.queryText.toLowerCase();
                results = results.filter(m =>
                    m.title.toLowerCase().includes(lower) ||
                    m.description.toLowerCase().includes(lower)
                );
            }

            setSearchedModules(results);
        } catch (error) {
            console.error("Error fetching public library:", error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Initial load
    useEffect(() => {
        // Initial fetch with default filters
        searchModules({
            queryText: '',
            serie: 'all',
            materia: 'all',
            status: 'all',
            scope: 'public'
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return {
        searchedModules,
        isLoading,
        moduleFilters,
        searchModules
    };
}
