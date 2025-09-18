/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRouter } from 'next/router';
import { RegistrationFlowProvider } from '@/contexts/RegistrationFlowContext';
import { IdentityProvider } from '@/contexts/IdentityContext';
import RegistrationFlowPage from '@/pages/registration/index';
import RegistrationConfirmationPage from '@/pages/registration/confirmation';
import RegistrationSuccessPage from '@/pages/registration/success';
import { useLiff } from '@/hooks/useLiff';
import { apiClient } from '@/services/api';

// Mock dependencies
jest.mock('next/router', () => ({
  useRouter: jest.fn(),
}));

jest.mock('@/hooks/useLiff', () => ({
  useLiff: jest.fn(),
}));

jest.mock('@/services/api', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
  },
  handleApiError: jest.fn(),
}));

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

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <IdentityProvider>
    <RegistrationFlowProvider>
      {children}
    </RegistrationFlowProvider>
  </IdentityProvider>
);

// Mock data
const mockLiffProfile = {
  userId: 'test-user-123',
  displayName: '測試使用者',
  pictureUrl: 'https://example.com/avatar.jpg',
};

const mockEvent = {
  id: 'event-123',
  name: '彰化供佛齋僧活動',
  description: '年度供佛齋僧活動',
  startDate: '2024-01-15T09:00:00Z',
  endDate: '2024-01-15T16:00:00Z',
  location: '彰化縣某寺院',
  maxParticipants: 100,
  currentParticipants: 50,
  registrationDeadline: '2024-01-10T23:59:59Z',
  status: 'open',
  pretixEventSlug: 'changhua-event-2024',
  transportOptions: [],
};

const mockTransportOptions = [
  {
    id: 'location-1',
    eventId: 'event-123',
    name: '彰化火車站',
    address: '彰化縣彰化市三民路1號',
    pickupTime: new Date('2024-01-15T07:30:00'),
    maxSeats: 45,
    bookedSeats: 32,
    coordinates: { lat: 24.0818, lng: 120.5387 }
  },
  {
    id: 'location-2',
    eventId: 'event-123',
    name: '員林轉運站',
    address: '彰化縣員林市中山路二段556號',
    pickupTime: new Date('2024-01-15T08:00:00'),
    maxSeats: 45,
    bookedSeats: 28,
    coordinates: { lat: 23.9588, lng: 120.5736 }
  },
];

describe('Complete Registration Flow E2E Tests', () => {
  const mockPush = jest.fn();
  const mockBack = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    
    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
      back: mockBack,
      query: { eventId: 'event-123' },
      pathname: '/registration',
    });

    (useLiff as jest.Mock).mockReturnValue({
      profile: mockLiffProfile,
      isInLineClient: true,
      initialized: true,
      loggedIn: true,
      loading: { isLoading: false },
      error: { hasError: false },
    });

    (apiClient.get as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/events/event-123')) {
        return Promise.resolve({ success: true, data: mockEvent });
      }
      if (url.includes('/events/event-123/transport')) {
        return Promise.resolve({ success: true, data: mockTransportOptions });
      }
      return Promise.resolve({ success: true, data: [] });
    });

    (apiClient.post as jest.Mock).mockResolvedValue({
      success: true,
      data: { registrationId: 'REG-123456789' },
    });

    mockLocalStorage.getItem.mockReturnValue(null);
    mockSessionStorage.getItem.mockReturnValue(null);
  });

  describe('Complete Registration Flow', () => {
    it('should complete the entire registration flow successfully', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <RegistrationFlowPage />
        </TestWrapper>
      );

      // Step 1: Identity Selection
      expect(screen.getByText('選擇您的身份')).toBeInTheDocument();
      
      const monkButton = screen.getByRole('button', { name: /法師/i });
      await user.click(monkButton);

      // Should proceed to event selection or personal info if event is already selected
      await waitFor(() => {
        expect(screen.getByText(/個人資料/i) || screen.getByText(/選擇活動/i)).toBeInTheDocument();
      });

      // If on personal info step (event already selected via query param)
      if (screen.queryByText('填寫個人資料')) {
        // Step 2: Personal Info Form
        const nameInput = screen.getByLabelText(/姓名/i);
        const phoneInput = screen.getByLabelText(/聯絡電話/i);
        const dharmaNameInput = screen.getByLabelText(/法名/i);
        const templeNameInput = screen.getByLabelText(/寺院名稱/i);

        await user.type(nameInput, '釋證嚴');
        await user.type(phoneInput, '0912345678');
        await user.type(dharmaNameInput, '證嚴');
        await user.type(templeNameInput, '慈濟功德會');

        const submitButton = screen.getByRole('button', { name: /提交/i });
        await user.click(submitButton);

        // Should proceed to transport selection
        await waitFor(() => {
          expect(screen.getByText(/交通安排/i)).toBeInTheDocument();
        });

        // Step 3: Transport Selection
        const transportOption = screen.getByText('彰化火車站');
        await user.click(transportOption);

        const confirmTransportButton = screen.getByRole('button', { name: /確認/i });
        await user.click(confirmTransportButton);

        // Should proceed to confirmation
        await waitFor(() => {
          expect(screen.getByText(/確認報名資料/i)).toBeInTheDocument();
        });

        // Step 4: Confirmation
        expect(screen.getByText('釋證嚴')).toBeInTheDocument();
        expect(screen.getByText('0912345678')).toBeInTheDocument();
        expect(screen.getByText('證嚴')).toBeInTheDocument();
        expect(screen.getByText('慈濟功德會')).toBeInTheDocument();
        expect(screen.getByText('彰化火車站')).toBeInTheDocument();

        const finalSubmitButton = screen.getByRole('button', { name: /確認提交報名/i });
        await user.click(finalSubmitButton);

        // Should call registration API
        await waitFor(() => {
          expect(apiClient.post).toHaveBeenCalledWith('/api/v1/registration', expect.objectContaining({
            eventId: 'event-123',
            identity: 'monk',
            personalInfo: expect.objectContaining({
              name: '釋證嚴',
              phone: '0912345678',
              dharmaName: '證嚴',
              templeName: '慈濟功德會',
            }),
            transport: expect.objectContaining({
              required: true,
              locationId: 'location-1',
            }),
          }));
        });

        // Should proceed to success page
        await waitFor(() => {
          expect(mockPush).toHaveBeenCalledWith('/registration/success');
        });
      }
    });

    it('should handle volunteer registration flow', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <RegistrationFlowPage />
        </TestWrapper>
      );

      // Step 1: Select volunteer identity
      const volunteerButton = screen.getByRole('button', { name: /志工/i });
      await user.click(volunteerButton);

      await waitFor(() => {
        expect(screen.getByText(/個人資料/i)).toBeInTheDocument();
      });

      // Step 2: Fill volunteer personal info
      const nameInput = screen.getByLabelText(/姓名/i);
      const phoneInput = screen.getByLabelText(/聯絡電話/i);

      await user.type(nameInput, '王小明');
      await user.type(phoneInput, '0987654321');

      // Volunteer should not have dharma name or temple name fields
      expect(screen.queryByLabelText(/法名/i)).not.toBeInTheDocument();
      expect(screen.queryByLabelText(/寺院名稱/i)).not.toBeInTheDocument();

      const submitButton = screen.getByRole('button', { name: /提交/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/交通安排/i)).toBeInTheDocument();
      });

      // Step 3: Select no transport (self-transportation)
      const noTransportButton = screen.getByRole('button', { name: /自行前往/i });
      await user.click(noTransportButton);

      await waitFor(() => {
        expect(screen.getByText(/確認報名資料/i)).toBeInTheDocument();
      });

      // Step 4: Confirm volunteer registration
      expect(screen.getByText('王小明')).toBeInTheDocument();
      expect(screen.getByText('0987654321')).toBeInTheDocument();
      expect(screen.getByText('自行前往')).toBeInTheDocument();

      const finalSubmitButton = screen.getByRole('button', { name: /確認提交報名/i });
      await user.click(finalSubmitButton);

      await waitFor(() => {
        expect(apiClient.post).toHaveBeenCalledWith('/api/v1/registration', expect.objectContaining({
          identity: 'volunteer',
          personalInfo: expect.objectContaining({
            name: '王小明',
            phone: '0987654321',
          }),
          transport: expect.objectContaining({
            required: false,
            locationId: null,
          }),
        }));
      });
    });

    it('should handle data persistence and recovery', async () => {
      const user = userEvent.setup();
      
      // Mock saved registration data
      const savedData = {
        currentStep: 'personal-info',
        completedSteps: ['identity'],
        identity: 'monk',
        selectedEventId: 'event-123',
        personalInfo: null,
        transportSelection: null,
        sessionId: 'test-session-123',
        lastSaved: new Date().toISOString(),
      };

      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(savedData));

      render(
        <TestWrapper>
          <RegistrationFlowPage />
        </TestWrapper>
      );

      // Should restore from saved data and show personal info step
      await waitFor(() => {
        expect(screen.getByText(/個人資料/i)).toBeInTheDocument();
      });

      // Progress indicator should show correct step
      const progressIndicator = screen.getByText(/個人資料/i);
      expect(progressIndicator).toBeInTheDocument();

      // Identity should be pre-selected as monk
      // (This would be reflected in the form fields available)
      expect(screen.getByLabelText(/法名/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/寺院名稱/i)).toBeInTheDocument();
    });

    it('should handle API errors gracefully', async () => {
      const user = userEvent.setup();
      
      // Mock API error
      (apiClient.post as jest.Mock).mockRejectedValue(new Error('網路連線失敗'));

      render(
        <TestWrapper>
          <RegistrationFlowPage />
        </TestWrapper>
      );

      // Complete the flow quickly to get to submission
      const monkButton = screen.getByRole('button', { name: /法師/i });
      await user.click(monkButton);

      await waitFor(() => {
        expect(screen.getByText(/個人資料/i)).toBeInTheDocument();
      });

      // Fill form
      const nameInput = screen.getByLabelText(/姓名/i);
      const phoneInput = screen.getByLabelText(/聯絡電話/i);
      
      await user.type(nameInput, '測試法師');
      await user.type(phoneInput, '0912345678');

      const submitButton = screen.getByRole('button', { name: /提交/i });
      await user.click(submitButton);

      // Skip transport for simplicity
      await waitFor(() => {
        if (screen.queryByText(/交通安排/i)) {
          const noTransportButton = screen.getByRole('button', { name: /自行前往/i });
          user.click(noTransportButton);
        }
      });

      await waitFor(() => {
        if (screen.queryByText(/確認報名資料/i)) {
          const finalSubmitButton = screen.getByRole('button', { name: /確認提交報名/i });
          user.click(finalSubmitButton);
        }
      });

      // Should show error message
      await waitFor(() => {
        expect(screen.getByText(/網路連線失敗/i)).toBeInTheDocument();
      });

      // Should not navigate to success page
      expect(mockPush).not.toHaveBeenCalledWith('/registration/success');
    });

    it('should validate required fields', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <RegistrationFlowPage />
        </TestWrapper>
      );

      // Select identity
      const monkButton = screen.getByRole('button', { name: /法師/i });
      await user.click(monkButton);

      await waitFor(() => {
        expect(screen.getByText(/個人資料/i)).toBeInTheDocument();
      });

      // Try to submit without filling required fields
      const submitButton = screen.getByRole('button', { name: /提交/i });
      await user.click(submitButton);

      // Should show validation errors
      await waitFor(() => {
        expect(screen.getByText(/請輸入姓名/i) || screen.getByText(/此欄位為必填/i)).toBeInTheDocument();
      });

      // Should not proceed to next step
      expect(screen.getByText(/個人資料/i)).toBeInTheDocument();
    });

    it('should allow navigation between completed steps', async () => {
      const user = userEvent.setup();
      
      // Mock data with completed steps
      const savedData = {
        currentStep: 'confirmation',
        completedSteps: ['identity', 'event', 'personal-info', 'transport'],
        identity: 'monk',
        selectedEventId: 'event-123',
        personalInfo: {
          name: '測試法師',
          phone: '0912345678',
          dharmaName: '測試',
          templeName: '測試寺',
        },
        transportSelection: {
          locationId: 'location-1',
          transport: mockTransportOptions[0],
        },
        sessionId: 'test-session-123',
        lastSaved: new Date().toISOString(),
      };

      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(savedData));

      render(
        <TestWrapper>
          <RegistrationFlowPage />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText(/確認報名資料/i)).toBeInTheDocument();
      });

      // Should be able to click on progress steps to navigate
      const progressSteps = screen.getAllByRole('button');
      const personalInfoStep = progressSteps.find(step => 
        step.textContent?.includes('個人資料') || step.getAttribute('aria-label')?.includes('個人資料')
      );

      if (personalInfoStep) {
        await user.click(personalInfoStep);
        
        await waitFor(() => {
          expect(screen.getByText(/個人資料/i)).toBeInTheDocument();
        });
      }
    });
  });

  describe('Registration Confirmation Page', () => {
    it('should display all registration data correctly', async () => {
      const user = userEvent.setup();
      
      (useRouter as jest.Mock).mockReturnValue({
        push: mockPush,
        back: mockBack,
        query: { eventId: 'event-123' },
        pathname: '/registration/confirmation',
      });

      // Mock complete registration data
      const completeData = {
        currentStep: 'confirmation',
        completedSteps: ['identity', 'event', 'personal-info', 'transport'],
        identity: 'monk',
        selectedEventId: 'event-123',
        personalInfo: {
          name: '釋證嚴',
          phone: '0912345678',
          dharmaName: '證嚴',
          templeName: '慈濟功德會',
          specialRequirements: '素食',
        },
        transportSelection: {
          locationId: 'location-1',
          transport: mockTransportOptions[0],
        },
        sessionId: 'test-session-123',
        lastSaved: new Date().toISOString(),
      };

      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(completeData));

      render(
        <TestWrapper>
          <RegistrationConfirmationPage />
        </TestWrapper>
      );

      // Should display event information
      await waitFor(() => {
        expect(screen.getByText('彰化供佛齋僧活動')).toBeInTheDocument();
      });

      // Should display personal information
      expect(screen.getByText('釋證嚴')).toBeInTheDocument();
      expect(screen.getByText('0912345678')).toBeInTheDocument();
      expect(screen.getByText('證嚴')).toBeInTheDocument();
      expect(screen.getByText('慈濟功德會')).toBeInTheDocument();
      expect(screen.getByText('素食')).toBeInTheDocument();

      // Should display transport information
      expect(screen.getByText('彰化火車站')).toBeInTheDocument();

      // Should have submit button
      const submitButton = screen.getByRole('button', { name: /確認提交報名/i });
      expect(submitButton).toBeInTheDocument();

      // Should have edit buttons
      const editButtons = screen.getAllByRole('button', { name: /修改/i });
      expect(editButtons.length).toBeGreaterThan(0);
    });

    it('should handle successful registration submission', async () => {
      const user = userEvent.setup();
      
      // Setup confirmation page with complete data
      const completeData = {
        currentStep: 'confirmation',
        completedSteps: ['identity', 'event', 'personal-info', 'transport'],
        identity: 'monk',
        selectedEventId: 'event-123',
        personalInfo: {
          name: '釋證嚴',
          phone: '0912345678',
        },
        transportSelection: null,
        sessionId: 'test-session-123',
        lastSaved: new Date().toISOString(),
      };

      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(completeData));

      render(
        <TestWrapper>
          <RegistrationConfirmationPage />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText(/確認報名資料/i)).toBeInTheDocument();
      });

      const submitButton = screen.getByRole('button', { name: /確認提交報名/i });
      await user.click(submitButton);

      // Should call registration API
      await waitFor(() => {
        expect(apiClient.post).toHaveBeenCalledWith('/api/v1/registration', expect.objectContaining({
          eventId: 'event-123',
          userId: 'test-user-123',
          identity: 'monk',
          personalInfo: expect.objectContaining({
            name: '釋證嚴',
            phone: '0912345678',
          }),
        }));
      });

      // Should navigate to success page
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/registration/success');
      });
    });
  });

  describe('Registration Success Page', () => {
    it('should display success message and registration details', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <RegistrationSuccessPage />
        </TestWrapper>
      );

      // Should display success message
      expect(screen.getByText(/報名成功/i)).toBeInTheDocument();

      // Should display registration ID
      expect(screen.getByText(/報名編號/i)).toBeInTheDocument();
      
      // Should display action buttons
      expect(screen.getByRole('button', { name: /查看報名狀態/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /報名其他活動/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /返回首頁/i })).toBeInTheDocument();

      // Should display next steps timeline
      expect(screen.getByText(/接下來會發生什麼/i)).toBeInTheDocument();
      expect(screen.getByText(/立即/i)).toBeInTheDocument();
      expect(screen.getByText(/活動前 3 天/i)).toBeInTheDocument();
      expect(screen.getByText(/活動前 1 天/i)).toBeInTheDocument();
      expect(screen.getByText(/活動當天/i)).toBeInTheDocument();
    });

    it('should handle navigation actions', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <RegistrationSuccessPage />
        </TestWrapper>
      );

      // Test view registrations button
      const viewRegistrationsButton = screen.getByRole('button', { name: /查看報名狀態/i });
      await user.click(viewRegistrationsButton);
      expect(mockPush).toHaveBeenCalledWith('/registrations');

      // Test register another button
      const registerAnotherButton = screen.getByRole('button', { name: /報名其他活動/i });
      await user.click(registerAnotherButton);
      expect(mockPush).toHaveBeenCalledWith('/events');

      // Test back to home button
      const backHomeButton = screen.getByRole('button', { name: /返回首頁/i });
      await user.click(backHomeButton);
      expect(mockPush).toHaveBeenCalledWith('/');
    });
  });

  describe('Data Persistence', () => {
    it('should save registration data to localStorage during flow', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <RegistrationFlowPage />
        </TestWrapper>
      );

      // Select identity
      const monkButton = screen.getByRole('button', { name: /法師/i });
      await user.click(monkButton);

      // Should save to localStorage
      await waitFor(() => {
        expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
          'registrationFlow',
          expect.stringContaining('"identity":"monk"')
        );
      });
    });

    it('should clear saved data after successful registration', async () => {
      const user = userEvent.setup();
      
      // Mock successful registration
      (apiClient.post as jest.Mock).mockResolvedValue({
        success: true,
        data: { registrationId: 'REG-123456789' },
      });

      const completeData = {
        currentStep: 'confirmation',
        completedSteps: ['identity', 'event', 'personal-info', 'transport'],
        identity: 'monk',
        selectedEventId: 'event-123',
        personalInfo: { name: '測試', phone: '0912345678' },
        transportSelection: null,
        sessionId: 'test-session-123',
        lastSaved: new Date().toISOString(),
      };

      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(completeData));

      render(
        <TestWrapper>
          <RegistrationConfirmationPage />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText(/確認報名資料/i)).toBeInTheDocument();
      });

      const submitButton = screen.getByRole('button', { name: /確認提交報名/i });
      await user.click(submitButton);

      // Should clear localStorage after successful submission
      await waitFor(() => {
        expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('registrationFlow');
      });
    });

    it('should handle expired saved data', async () => {
      // Mock expired data (older than 24 hours)
      const expiredData = {
        currentStep: 'personal-info',
        completedSteps: ['identity'],
        identity: 'monk',
        selectedEventId: 'event-123',
        personalInfo: null,
        transportSelection: null,
        sessionId: 'test-session-123',
        lastSaved: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(), // 25 hours ago
      };

      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(expiredData));

      render(
        <TestWrapper>
          <RegistrationFlowPage />
        </TestWrapper>
      );

      // Should start from beginning (identity selection) instead of restoring expired data
      await waitFor(() => {
        expect(screen.getByText('選擇您的身份')).toBeInTheDocument();
      });

      // Should clear expired data
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('registrationFlow');
    });
  });
});