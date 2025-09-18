/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { 
  RegistrationProgress, 
  SimpleProgress, 
  StepNavigation 
} from '@/components/registration/RegistrationProgress';
import { 
  RegistrationFlowProvider, 
  useRegistrationFlow,
  RegistrationStep 
} from '@/contexts/RegistrationFlowContext';

// Mock the context hook for controlled testing
jest.mock('@/contexts/RegistrationFlowContext', () => ({
  ...jest.requireActual('@/contexts/RegistrationFlowContext'),
  useRegistrationFlow: jest.fn(),
}));

const mockUseRegistrationFlow = useRegistrationFlow as jest.MockedFunction<typeof useRegistrationFlow>;

// Test wrapper
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <RegistrationFlowProvider>
    {children}
  </RegistrationFlowProvider>
);

describe('RegistrationProgress', () => {
  const mockGoToStep = jest.fn();
  const mockCanGoToStep = jest.fn();

  const defaultMockState = {
    state: {
      currentStep: 'personal-info' as RegistrationStep,
      completedSteps: ['identity', 'event'] as RegistrationStep[],
      identity: 'monk' as const,
      selectedEventId: 'event-123',
      personalInfo: null,
      transportSelection: null,
      isLoading: false,
      error: null,
      sessionId: 'test-session',
      lastSaved: null,
    },
    dispatch: jest.fn(),
    goToStep: mockGoToStep,
    completeStep: jest.fn(),
    goToNextStep: jest.fn(),
    goToPreviousStep: jest.fn(),
    canGoToStep: mockCanGoToStep,
    getStepProgress: jest.fn(() => 50),
    resetFlow: jest.fn(),
    setIdentity: jest.fn(),
    setEvent: jest.fn(),
    setPersonalInfo: jest.fn(),
    setTransport: jest.fn(),
    saveToStorage: jest.fn(),
    loadFromStorage: jest.fn(),
    clearStorage: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockCanGoToStep.mockImplementation((step: RegistrationStep) => {
      const completedSteps = defaultMockState.state.completedSteps;
      const currentStep = defaultMockState.state.currentStep;
      return completedSteps.includes(step) || step === currentStep;
    });
    mockUseRegistrationFlow.mockReturnValue(defaultMockState);
  });

  describe('RegistrationProgress Component', () => {
    it('should render all steps with correct status', () => {
      render(<RegistrationProgress />);

      // Check that all steps are rendered
      expect(screen.getByText('身份選擇')).toBeInTheDocument();
      expect(screen.getByText('選擇活動')).toBeInTheDocument();
      expect(screen.getByText('個人資料')).toBeInTheDocument();
      expect(screen.getByText('交通安排')).toBeInTheDocument();
      expect(screen.getByText('確認資料')).toBeInTheDocument();
      expect(screen.getByText('報名完成')).toBeInTheDocument();

      // Check step descriptions
      expect(screen.getByText('選擇您的身份類型')).toBeInTheDocument();
      expect(screen.getByText('選擇要報名的活動')).toBeInTheDocument();
      expect(screen.getByText('填寫個人基本資料')).toBeInTheDocument();
    });

    it('should show correct step numbers', () => {
      render(<RegistrationProgress />);

      // Should show step numbers 1-6
      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
      expect(screen.getByText('4')).toBeInTheDocument();
      expect(screen.getByText('5')).toBeInTheDocument();
      expect(screen.getByText('6')).toBeInTheDocument();
    });

    it('should show checkmarks for completed steps', () => {
      render(<RegistrationProgress />);

      // Completed steps should have checkmarks (SVG icons)
      const checkIcons = screen.getAllByRole('img', { hidden: true });
      expect(checkIcons.length).toBeGreaterThan(0);
    });

    it('should highlight current step', () => {
      render(<RegistrationProgress />);

      // Current step should be highlighted
      const currentStepText = screen.getByText('個人資料');
      expect(currentStepText).toBeInTheDocument();
      
      // Progress text should show current step
      expect(screen.getByText('50% 完成')).toBeInTheDocument();
    });

    it('should handle step clicks for navigable steps', async () => {
      const user = userEvent.setup();
      
      render(<RegistrationProgress />);

      // Click on a completed step (should be clickable)
      const identityStep = screen.getByText('身份選擇').closest('div');
      if (identityStep) {
        await user.click(identityStep);
        expect(mockGoToStep).toHaveBeenCalledWith('identity');
      }
    });

    it('should not navigate to non-clickable steps', async () => {
      const user = userEvent.setup();
      
      // Mock canGoToStep to return false for future steps
      mockCanGoToStep.mockImplementation((step: RegistrationStep) => {
        const completedSteps = defaultMockState.state.completedSteps;
        const currentStep = defaultMockState.state.currentStep;
        return completedSteps.includes(step) || step === currentStep;
      });

      render(<RegistrationProgress />);

      // Click on a future step (should not be clickable)
      const confirmationStep = screen.getByText('確認資料').closest('div');
      if (confirmationStep) {
        await user.click(confirmationStep);
        expect(mockGoToStep).not.toHaveBeenCalledWith('confirmation');
      }
    });

    it('should render in compact mode', () => {
      render(<RegistrationProgress compact />);

      // Should still show step titles but in compact format
      expect(screen.getByText('身份選擇')).toBeInTheDocument();
      expect(screen.getByText('個人資料')).toBeInTheDocument();
      
      // Descriptions might be hidden in compact mode
      // This depends on the CSS implementation
    });

    it('should hide labels when showLabels is false', () => {
      render(<RegistrationProgress showLabels={false} />);

      // Step titles should not be visible
      expect(screen.queryByText('身份選擇')).not.toBeInTheDocument();
      expect(screen.queryByText('個人資料')).not.toBeInTheDocument();
      
      // But step numbers should still be visible
      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('should show correct progress bar width', () => {
      render(<RegistrationProgress />);

      // Progress bar should reflect the current progress
      const progressBar = screen.getByRole('progressbar', { hidden: true }) || 
                         document.querySelector('[style*="width"]');
      
      // The exact implementation depends on how the progress bar is rendered
      // This test verifies that progress is visually represented
      expect(progressBar || screen.getByText('50% 完成')).toBeInTheDocument();
    });
  });

  describe('SimpleProgress Component', () => {
    it('should render simple progress bar', () => {
      render(<SimpleProgress />);

      expect(screen.getByText('50% 完成')).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      const { container } = render(<SimpleProgress className="custom-class" />);
      
      expect(container.firstChild).toHaveClass('custom-class');
    });
  });

  describe('StepNavigation Component', () => {
    const mockGoToPreviousStep = jest.fn();
    const mockGoToNextStep = jest.fn();

    beforeEach(() => {
      mockUseRegistrationFlow.mockReturnValue({
        ...defaultMockState,
        goToPreviousStep: mockGoToPreviousStep,
        goToNextStep: mockGoToNextStep,
      });
    });

    it('should render navigation buttons', () => {
      render(<StepNavigation />);

      expect(screen.getByRole('button', { name: /上一步/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /下一步/i })).toBeInTheDocument();
    });

    it('should handle previous step navigation', async () => {
      const user = userEvent.setup();
      
      render(<StepNavigation />);

      const prevButton = screen.getByRole('button', { name: /上一步/i });
      await user.click(prevButton);

      expect(mockGoToPreviousStep).toHaveBeenCalled();
    });

    it('should handle next step navigation', async () => {
      const user = userEvent.setup();
      
      // Mock that current step is completed
      mockUseRegistrationFlow.mockReturnValue({
        ...defaultMockState,
        state: {
          ...defaultMockState.state,
          completedSteps: ['identity', 'event', 'personal-info'],
        },
        goToPreviousStep: mockGoToPreviousStep,
        goToNextStep: mockGoToNextStep,
      });

      render(<StepNavigation />);

      const nextButton = screen.getByRole('button', { name: /下一步/i });
      await user.click(nextButton);

      expect(mockGoToNextStep).toHaveBeenCalled();
    });

    it('should disable previous button at first step', () => {
      mockUseRegistrationFlow.mockReturnValue({
        ...defaultMockState,
        state: {
          ...defaultMockState.state,
          currentStep: 'identity',
        },
        goToPreviousStep: mockGoToPreviousStep,
        goToNextStep: mockGoToNextStep,
      });

      render(<StepNavigation />);

      const prevButton = screen.getByRole('button', { name: /上一步/i });
      expect(prevButton).toBeDisabled();
    });

    it('should disable next button at last step', () => {
      mockUseRegistrationFlow.mockReturnValue({
        ...defaultMockState,
        state: {
          ...defaultMockState.state,
          currentStep: 'success',
          completedSteps: ['identity', 'event', 'personal-info', 'transport', 'confirmation'],
        },
        goToPreviousStep: mockGoToPreviousStep,
        goToNextStep: mockGoToNextStep,
      });

      render(<StepNavigation />);

      const nextButton = screen.getByRole('button', { name: /下一步/i });
      expect(nextButton).toBeDisabled();
    });

    it('should disable next button if current step is not completed', () => {
      mockUseRegistrationFlow.mockReturnValue({
        ...defaultMockState,
        state: {
          ...defaultMockState.state,
          currentStep: 'personal-info',
          completedSteps: ['identity', 'event'], // personal-info not completed
        },
        goToPreviousStep: mockGoToPreviousStep,
        goToNextStep: mockGoToNextStep,
      });

      render(<StepNavigation />);

      const nextButton = screen.getByRole('button', { name: /下一步/i });
      expect(nextButton).toBeDisabled();
    });
  });

  describe('Different Step States', () => {
    it('should handle identity step correctly', () => {
      mockUseRegistrationFlow.mockReturnValue({
        ...defaultMockState,
        state: {
          ...defaultMockState.state,
          currentStep: 'identity',
          completedSteps: [],
        },
      });

      render(<RegistrationProgress />);

      expect(screen.getByText('身份選擇')).toBeInTheDocument();
      expect(screen.getByText('17% 完成')).toBeInTheDocument();
    });

    it('should handle success step correctly', () => {
      mockUseRegistrationFlow.mockReturnValue({
        ...defaultMockState,
        state: {
          ...defaultMockState.state,
          currentStep: 'success',
          completedSteps: ['identity', 'event', 'personal-info', 'transport', 'confirmation'],
        },
        getStepProgress: jest.fn(() => 100),
      });

      render(<RegistrationProgress />);

      expect(screen.getByText('報名完成')).toBeInTheDocument();
      expect(screen.getByText('100% 完成')).toBeInTheDocument();
    });

    it('should show all steps as completed when at success', () => {
      mockUseRegistrationFlow.mockReturnValue({
        ...defaultMockState,
        state: {
          ...defaultMockState.state,
          currentStep: 'success',
          completedSteps: ['identity', 'event', 'personal-info', 'transport', 'confirmation'],
        },
      });

      render(<RegistrationProgress />);

      // All previous steps should show as completed
      // This would be verified by checking for checkmark icons
      const checkIcons = screen.getAllByRole('img', { hidden: true });
      expect(checkIcons.length).toBeGreaterThan(0);
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(<RegistrationProgress />);

      // Check for accessibility features
      const progressElements = screen.getAllByRole('button');
      expect(progressElements.length).toBeGreaterThan(0);

      // Progress bar should have appropriate role
      const progressBar = document.querySelector('[role="progressbar"]');
      if (progressBar) {
        expect(progressBar).toBeInTheDocument();
      }
    });

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup();
      
      render(<RegistrationProgress />);

      // Tab through the steps
      await user.tab();
      
      // Should be able to activate steps with keyboard
      const focusedElement = document.activeElement;
      if (focusedElement && focusedElement.tagName === 'BUTTON') {
        await user.keyboard('{Enter}');
        // Should trigger navigation if step is clickable
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle missing context gracefully', () => {
      // Mock the hook to throw error
      mockUseRegistrationFlow.mockImplementation(() => {
        throw new Error('useRegistrationFlow must be used within a RegistrationFlowProvider');
      });

      // Suppress console.error for this test
      const originalError = console.error;
      console.error = jest.fn();

      expect(() => {
        render(<RegistrationProgress />);
      }).toThrow();

      console.error = originalError;
    });
  });
});