/**
 * @jest-environment jsdom
 */

import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { 
  RegistrationFlowProvider, 
  useRegistrationFlow,
  RegistrationStep,
  STEP_INFO 
} from '@/contexts/RegistrationFlowContext';
import { PersonalInfoFormData } from '@/utils/form-validation';
import { TransportOption } from '@/types';

// Mock localStorage and sessionStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};

const mockSessionStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

Object.defineProperty(window, 'sessionStorage', {
  value: mockSessionStorage,
});

// Test wrapper
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <RegistrationFlowProvider>{children}</RegistrationFlowProvider>
);

// Mock data
const mockPersonalInfo: PersonalInfoFormData = {
  name: '測試使用者',
  phone: '0912345678',
  idNumber: 'A123456789',
  birthDate: '1990-01-01',
  specialRequirements: '素食',
  dharmaName: '測試法師',
  templeName: '測試寺',
};

const mockTransportOption: TransportOption = {
  id: 'location-1',
  eventId: 'event-123',
  name: '彰化火車站',
  address: '彰化縣彰化市三民路1號',
  pickupTime: new Date('2024-01-15T07:30:00'),
  maxSeats: 45,
  bookedSeats: 32,
  coordinates: { lat: 24.0818, lng: 120.5387 }
};

describe('RegistrationFlowContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue(null);
    mockSessionStorage.getItem.mockReturnValue(null);
  });

  describe('Initial State', () => {
    it('should initialize with correct default state', () => {
      const { result } = renderHook(() => useRegistrationFlow(), { wrapper });

      expect(result.current.state.currentStep).toBe('identity');
      expect(result.current.state.completedSteps).toEqual([]);
      expect(result.current.state.identity).toBeNull();
      expect(result.current.state.selectedEventId).toBeNull();
      expect(result.current.state.personalInfo).toBeNull();
      expect(result.current.state.transportSelection).toBeNull();
      expect(result.current.state.isLoading).toBe(false);
      expect(result.current.state.error).toBeNull();
      expect(result.current.state.sessionId).toBeTruthy();
      expect(result.current.state.lastSaved).toBeNull();
    });

    it('should generate unique session IDs', () => {
      const { result: result1 } = renderHook(() => useRegistrationFlow(), { wrapper });
      const { result: result2 } = renderHook(() => useRegistrationFlow(), { wrapper });

      expect(result1.current.state.sessionId).not.toBe(result2.current.state.sessionId);
    });
  });

  describe('Step Navigation', () => {
    it('should navigate to valid steps', () => {
      const { result } = renderHook(() => useRegistrationFlow(), { wrapper });

      act(() => {
        result.current.goToStep('event');
      });

      expect(result.current.state.currentStep).toBe('event');
    });

    it('should complete steps and track them', () => {
      const { result } = renderHook(() => useRegistrationFlow(), { wrapper });

      act(() => {
        result.current.completeStep('identity');
      });

      expect(result.current.state.completedSteps).toContain('identity');
      expect(result.current.state.lastSaved).toBeTruthy();
    });

    it('should navigate to next step', () => {
      const { result } = renderHook(() => useRegistrationFlow(), { wrapper });

      // Complete current step first
      act(() => {
        result.current.completeStep('identity');
      });

      act(() => {
        result.current.goToNextStep();
      });

      expect(result.current.state.currentStep).toBe('event');
    });

    it('should navigate to previous step', () => {
      const { result } = renderHook(() => useRegistrationFlow(), { wrapper });

      // Move to a later step first
      act(() => {
        result.current.goToStep('event');
      });

      act(() => {
        result.current.goToPreviousStep();
      });

      expect(result.current.state.currentStep).toBe('identity');
    });

    it('should not navigate beyond boundaries', () => {
      const { result } = renderHook(() => useRegistrationFlow(), { wrapper });

      // Try to go to previous step from first step
      act(() => {
        result.current.goToPreviousStep();
      });

      expect(result.current.state.currentStep).toBe('identity');

      // Move to last step
      act(() => {
        result.current.goToStep('success');
      });

      // Try to go to next step from last step
      act(() => {
        result.current.goToNextStep();
      });

      expect(result.current.state.currentStep).toBe('success');
    });
  });

  describe('Step Validation', () => {
    it('should allow navigation to current step', () => {
      const { result } = renderHook(() => useRegistrationFlow(), { wrapper });

      expect(result.current.canGoToStep('identity')).toBe(true);
    });

    it('should allow navigation to completed steps', () => {
      const { result } = renderHook(() => useRegistrationFlow(), { wrapper });

      act(() => {
        result.current.completeStep('identity');
      });

      expect(result.current.canGoToStep('identity')).toBe(true);
    });

    it('should allow navigation to next step if current is completed', () => {
      const { result } = renderHook(() => useRegistrationFlow(), { wrapper });

      act(() => {
        result.current.completeStep('identity');
      });

      expect(result.current.canGoToStep('event')).toBe(true);
    });

    it('should not allow navigation to future steps if current is not completed', () => {
      const { result } = renderHook(() => useRegistrationFlow(), { wrapper });

      expect(result.current.canGoToStep('personal-info')).toBe(false);
    });
  });

  describe('Progress Calculation', () => {
    it('should calculate correct progress percentage', () => {
      const { result } = renderHook(() => useRegistrationFlow(), { wrapper });

      // At identity step (step 1 of 6)
      expect(result.current.getStepProgress()).toBe(17); // Math.round((1/6) * 100)

      act(() => {
        result.current.goToStep('event');
      });

      // At event step (step 2 of 6)
      expect(result.current.getStepProgress()).toBe(33); // Math.round((2/6) * 100)

      act(() => {
        result.current.goToStep('success');
      });

      // At success step (step 6 of 6)
      expect(result.current.getStepProgress()).toBe(100); // Math.round((6/6) * 100)
    });
  });

  describe('Data Management', () => {
    it('should set identity data', () => {
      const { result } = renderHook(() => useRegistrationFlow(), { wrapper });

      act(() => {
        result.current.setIdentity('monk');
      });

      expect(result.current.state.identity).toBe('monk');
      expect(result.current.state.lastSaved).toBeTruthy();
    });

    it('should set event data', () => {
      const { result } = renderHook(() => useRegistrationFlow(), { wrapper });

      act(() => {
        result.current.setEvent('event-123');
      });

      expect(result.current.state.selectedEventId).toBe('event-123');
      expect(result.current.state.lastSaved).toBeTruthy();
    });

    it('should set personal info data', () => {
      const { result } = renderHook(() => useRegistrationFlow(), { wrapper });

      act(() => {
        result.current.setPersonalInfo(mockPersonalInfo);
      });

      expect(result.current.state.personalInfo).toEqual(mockPersonalInfo);
      expect(result.current.state.lastSaved).toBeTruthy();
    });

    it('should set transport data', () => {
      const { result } = renderHook(() => useRegistrationFlow(), { wrapper });

      const transportSelection = {
        locationId: 'location-1',
        transport: mockTransportOption,
      };

      act(() => {
        result.current.setTransport(transportSelection);
      });

      expect(result.current.state.transportSelection).toEqual(transportSelection);
      expect(result.current.state.lastSaved).toBeTruthy();
    });
  });

  describe('Flow Reset', () => {
    it('should reset flow to initial state', () => {
      const { result } = renderHook(() => useRegistrationFlow(), { wrapper });

      // Set some data first
      act(() => {
        result.current.setIdentity('monk');
        result.current.setEvent('event-123');
        result.current.completeStep('identity');
        result.current.goToStep('event');
      });

      // Reset flow
      act(() => {
        result.current.resetFlow();
      });

      expect(result.current.state.currentStep).toBe('identity');
      expect(result.current.state.completedSteps).toEqual([]);
      expect(result.current.state.identity).toBeNull();
      expect(result.current.state.selectedEventId).toBeNull();
      expect(result.current.state.personalInfo).toBeNull();
      expect(result.current.state.transportSelection).toBeNull();
      expect(result.current.state.error).toBeNull();
    });
  });

  describe('Data Persistence', () => {
    it('should save data to localStorage', () => {
      const { result } = renderHook(() => useRegistrationFlow(), { wrapper });

      act(() => {
        result.current.setIdentity('monk');
      });

      act(() => {
        result.current.saveToStorage();
      });

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'registrationFlow',
        expect.stringContaining('"identity":"monk"')
      );
    });

    it('should save data to sessionStorage', () => {
      const { result } = renderHook(() => useRegistrationFlow(), { wrapper });

      act(() => {
        result.current.setIdentity('volunteer');
      });

      act(() => {
        result.current.saveToStorage();
      });

      expect(mockSessionStorage.setItem).toHaveBeenCalledWith(
        expect.stringMatching(/registrationFlow_/),
        expect.stringContaining('"identity":"volunteer"')
      );
    });

    it('should load data from storage', () => {
      const savedData = {
        currentStep: 'personal-info',
        completedSteps: ['identity', 'event'],
        identity: 'monk',
        selectedEventId: 'event-123',
        personalInfo: mockPersonalInfo,
        transportSelection: null,
        sessionId: 'test-session-123',
        lastSaved: new Date().toISOString(),
      };

      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(savedData));

      const { result } = renderHook(() => useRegistrationFlow(), { wrapper });

      act(() => {
        const loaded = result.current.loadFromStorage();
        expect(loaded).toBe(true);
      });

      expect(result.current.state.currentStep).toBe('personal-info');
      expect(result.current.state.completedSteps).toEqual(['identity', 'event']);
      expect(result.current.state.identity).toBe('monk');
      expect(result.current.state.selectedEventId).toBe('event-123');
      expect(result.current.state.personalInfo).toEqual(mockPersonalInfo);
    });

    it('should prefer sessionStorage over localStorage', () => {
      const localData = {
        currentStep: 'identity',
        identity: 'volunteer',
        sessionId: 'local-session',
        lastSaved: new Date().toISOString(),
      };

      const sessionData = {
        currentStep: 'event',
        identity: 'monk',
        sessionId: 'session-session',
        lastSaved: new Date().toISOString(),
      };

      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(localData));
      mockSessionStorage.getItem.mockReturnValue(JSON.stringify(sessionData));

      const { result } = renderHook(() => useRegistrationFlow(), { wrapper });

      act(() => {
        result.current.loadFromStorage();
      });

      // Should use sessionStorage data
      expect(result.current.state.currentStep).toBe('event');
      expect(result.current.state.identity).toBe('monk');
    });

    it('should handle expired data', () => {
      const expiredData = {
        currentStep: 'personal-info',
        identity: 'monk',
        sessionId: 'expired-session',
        lastSaved: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(), // 25 hours ago
      };

      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(expiredData));

      const { result } = renderHook(() => useRegistrationFlow(), { wrapper });

      act(() => {
        const loaded = result.current.loadFromStorage();
        expect(loaded).toBe(false);
      });

      // Should not load expired data
      expect(result.current.state.currentStep).toBe('identity');
      expect(result.current.state.identity).toBeNull();

      // Should clear expired data
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('registrationFlow');
    });

    it('should clear storage', () => {
      const { result } = renderHook(() => useRegistrationFlow(), { wrapper });

      act(() => {
        result.current.clearStorage();
      });

      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('registrationFlow');
      expect(mockSessionStorage.removeItem).toHaveBeenCalledWith(
        expect.stringMatching(/registrationFlow_/)
      );
    });

    it('should handle storage errors gracefully', () => {
      const { result } = renderHook(() => useRegistrationFlow(), { wrapper });

      // Mock storage error
      mockLocalStorage.setItem.mockImplementation(() => {
        throw new Error('Storage quota exceeded');
      });

      // Should not throw error
      act(() => {
        result.current.setIdentity('monk');
      });

      act(() => {
        result.current.saveToStorage();
      });

      // Should still update state even if storage fails
      expect(result.current.state.identity).toBe('monk');
    });
  });

  describe('Error Handling', () => {
    it('should set and clear errors', () => {
      const { result } = renderHook(() => useRegistrationFlow(), { wrapper });

      act(() => {
        result.current.dispatch({ type: 'SET_ERROR', payload: '測試錯誤' });
      });

      expect(result.current.state.error).toBe('測試錯誤');
      expect(result.current.state.isLoading).toBe(false);

      act(() => {
        result.current.dispatch({ type: 'SET_ERROR', payload: null });
      });

      expect(result.current.state.error).toBeNull();
    });

    it('should set loading state', () => {
      const { result } = renderHook(() => useRegistrationFlow(), { wrapper });

      act(() => {
        result.current.dispatch({ type: 'SET_LOADING', payload: true });
      });

      expect(result.current.state.isLoading).toBe(true);

      act(() => {
        result.current.dispatch({ type: 'SET_LOADING', payload: false });
      });

      expect(result.current.state.isLoading).toBe(false);
    });
  });

  describe('Step Information', () => {
    it('should provide correct step information', () => {
      expect(STEP_INFO.identity.title).toBe('身份選擇');
      expect(STEP_INFO.event.title).toBe('選擇活動');
      expect(STEP_INFO['personal-info'].title).toBe('個人資料');
      expect(STEP_INFO.transport.title).toBe('交通安排');
      expect(STEP_INFO.confirmation.title).toBe('確認資料');
      expect(STEP_INFO.success.title).toBe('報名完成');

      // Check descriptions exist
      Object.values(STEP_INFO).forEach(stepInfo => {
        expect(stepInfo.description).toBeTruthy();
      });
    });
  });

  describe('Context Provider Error', () => {
    it('should throw error when used outside provider', () => {
      // Suppress console.error for this test
      const originalError = console.error;
      console.error = jest.fn();

      expect(() => {
        renderHook(() => useRegistrationFlow());
      }).toThrow('useRegistrationFlow must be used within a RegistrationFlowProvider');

      console.error = originalError;
    });
  });
});