
import React, { Fragment } from 'react';
import { Listbox, ListboxButton, ListboxOptions, ListboxOption, Transition } from '@headlessui/react';

export const InputField: React.FC<{ label: string, required?: boolean, children: React.ReactNode, helperText?: string }> = ({ label, required, children, helperText }) => (
    <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1 hc-text-secondary">
            {label} {required && <span className="text-red-500">*</span>}
        </label>
        {children}
        {helperText && <p className="mt-1 text-xs text-gray-500 dark:text-slate-400 hc-text-secondary">{helperText}</p>}
    </div>
);

export const SelectField: React.FC<{ value: string, onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void, children: React.ReactNode }> = ({ value, onChange, children }) => (
    <select value={value} onChange={onChange} className="w-full p-2 input-tech">
        {children}
    </select>
);

interface CustomSelectOption {
    label: string;
    value: string;
}

interface CustomSelectProps {
    label?: string;
    value: string;
    onChange: (value: string) => void;
    options: CustomSelectOption[];
    placeholder?: string;
}

export const CustomSelect: React.FC<CustomSelectProps> = ({ label, value, onChange, options, placeholder = "Selecione..." }) => {
    const selectedOption = options.find(opt => opt.value === value);

    return (
        <div className="w-full">
            {label && (
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5 tracking-wider">
                    {label}
                </label>
            )}
            <Listbox value={value} onChange={onChange}>
                <div className="relative mt-1">
                    <ListboxButton className="relative w-full cursor-pointer bg-[#0d1117] border border-slate-700 rounded-xl py-3 pl-4 pr-10 text-left text-sm text-slate-200 shadow-sm focus:outline-none focus-visible:border-brand focus-visible:ring-1 focus-visible:ring-brand transition-all hover:bg-[#161b22] hover:border-slate-600">
                        <span className="block truncate font-medium">
                            {selectedOption ? selectedOption.label : <span className="text-slate-500">{placeholder}</span>}
                        </span>
                        <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-500" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 3a1 1 0 01.707.293l3 3a1 1 0 01-1.414 1.414L10 5.414 7.707 7.707a1 1 0 01-1.414-1.414l3-3A1 1 0 0110 3zm-3.707 9.293a1 1 0 011.414 0L10 14.586l2.293-2.293a1 1 0 011.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                        </span>
                    </ListboxButton>
                    <Transition
                        as={Fragment}
                        leave="transition ease-in duration-100"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                    >
                        <ListboxOptions className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-xl bg-[#161b22] border border-slate-700 py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm custom-scrollbar">
                            {options.map((option, personIdx) => (
                                <ListboxOption
                                    key={personIdx}
                                    className={({ active, selected }) =>
                                        `relative cursor-pointer select-none py-2.5 pl-10 pr-4 transition-colors ${
                                            active ? 'bg-brand/10 text-brand' : 'text-slate-300'
                                        } ${selected ? 'bg-white/5 text-white font-bold' : ''}`
                                    }
                                    value={option.value}
                                >
                                    {({ selected }) => (
                                        <>
                                            <span className={`block truncate ${selected ? 'font-bold' : 'font-normal'}`}>
                                                {option.label}
                                            </span>
                                            {selected ? (
                                                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-brand">
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                    </svg>
                                                </span>
                                            ) : null}
                                        </>
                                    )}
                                </ListboxOption>
                            ))}
                        </ListboxOptions>
                    </Transition>
                </div>
            </Listbox>
        </div>
    );
};

export const MultiSelect: React.FC<{
    options: string[];
    selected: string[];
    onChange: (selected: string[]) => void;
    label: string;
    error?: boolean;
    helperText?: string;
    id?: string;
}> = ({ options, selected, onChange, label, error, helperText, id }) => {
    const toggleOption = (option: string) => {
        if (selected.includes(option)) {
            onChange(selected.filter(item => item !== option));
        } else {
            onChange([...selected, option]);
        }
    };

    const errorId = id ? `${id}-error` : undefined;
    const descriptionId = id ? `${id}-description` : undefined;
    const labelId = id ? `${id}-label` : undefined;

    return (
        <div className="space-y-2" role="group" aria-labelledby={labelId}>
            <label id={labelId} className={`block text-sm font-medium ${error ? 'text-red-600 dark:text-red-400' : 'text-gray-700 dark:text-slate-300'}`}>
                {label} <span className="text-red-500">*</span>
            </label>
            <div 
                className={`p-3 border rounded-md bg-white dark:bg-slate-700 max-h-48 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-2 ${error ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-slate-600'}`}
                aria-describedby={error ? errorId : helperText ? descriptionId : undefined}
            >
                {options.map(option => (
                    <label key={option} className="flex items-center space-x-2 cursor-pointer p-1 hover:bg-slate-50 dark:hover:bg-slate-600 rounded">
                        <input
                            type="checkbox"
                            checked={selected.includes(option)}
                            onChange={() => toggleOption(option)}
                            className="h-4 w-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500 dark:bg-slate-600 dark:border-slate-500"
                        />
                        <span className="text-sm text-slate-700 dark:text-slate-200">{option}</span>
                    </label>
                ))}
            </div>
            {(error || helperText) && (
                <p 
                    id={error ? errorId : descriptionId}
                    role={error ? "alert" : undefined}
                    className={`text-xs ${error ? 'text-red-500 font-semibold' : 'text-slate-500 dark:text-slate-400'}`}
                >
                    {error ? (helperText || 'Selecione pelo menos uma opção.') : helperText}
                </p>
            )}
            <p className="text-xs text-slate-500 dark:text-slate-400">
                {selected.length === 0 ? 'Nenhum selecionado' : `${selected.length} selecionado(s)`}
            </p>
        </div>
    );
};
