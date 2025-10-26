import React from 'react';
import { Check } from 'lucide-react';

const steps = [
  { id: 1, name: 'Details' },
  { id: 2, name: 'Items' },
  { id: 3, name: 'AI Tips' },
  { id: 4, name: 'Weight' },
  { id: 5, name: 'Strategy' }
];

export default function StepIndicator({ currentStep }) {
  return (
    <div className="w-full py-4">
      <div className="flex items-center justify-between max-w-2xl mx-auto">
        {steps.map((step, index) => (
          <React.Fragment key={step.id}>
            <div className="flex flex-col items-center gap-2 flex-1">
              <div 
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
                  step.id < currentStep 
                    ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg' 
                    : step.id === currentStep
                    ? 'bg-gradient-to-br from-blue-400 to-blue-500 text-white shadow-md ring-4 ring-blue-100'
                    : 'bg-gray-200 text-gray-400'
                }`}
              >
                {step.id < currentStep ? (
                  <Check className="w-5 h-5" />
                ) : (
                  <span className="text-sm font-semibold">{step.id}</span>
                )}
              </div>
              <span className={`text-xs font-medium hidden sm:block ${
                step.id <= currentStep ? 'text-blue-600' : 'text-gray-400'
              }`}>
                {step.name}
              </span>
            </div>
            
            {index < steps.length - 1 && (
              <div className="flex-1 h-0.5 mx-2 -mt-6">
                <div 
                  className={`h-full transition-all duration-300 ${
                    step.id < currentStep ? 'bg-blue-500' : 'bg-gray-200'
                  }`}
                />
              </div>
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}