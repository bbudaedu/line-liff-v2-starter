import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useRouter } from 'next/router';
import TransportRegistrationPage from '../../pages/registration/transport';
import { useLiff } from '../../hooks/useLiff';
import { TransportService } from '../../services/transport';

// Mock dependencies
jest.mock('next/router', () => ({
  useRouter: jest.fn()
}));

jest.mock('../../hooks/useLiff', () => ({
  useLiff: jest.fn()
}));

jest.mock('../../services/transport', () => ({
  TransportService: {
    getTransportOptions: jest.fn(),
    registerTransport: jest.fn(),
    getUserTransportRegistration: jest.fn(),
    updateSeatAvailability: jest.fn(),
    checkLocationAvailability: jest.fn()
  }
}));

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn()
};
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage
});

describe('Transport Registration Flow Integration', () => {
  const mockPush = jest.fn();
  const mockRouter = {
    push: mockPush,
    query: { eventId: 'test-event-1' }
  };

  const mockLiffProfile = {
    userId: 'test-user-1',
    displayName: 'Test User',
    pictureUrl: 'https://example.com/avatar.jpg'
  };

  const mockTransportOptions = [
    {
      id: 'location-1',
      eventId: 'test-event-1',
      name: '彰化火車站',
      address: '彰化縣彰化市三民路1號',
      pickupTime: new Date('2024-01-15T07:30:00'),
      maxSeats: 45,
      bookedSeats: 32,
      coordinates: { lat: 24.0818, lng: 120.5387 }
    },
    {
      id: 'location-2',
      eventId: 'test-event-1',
      name: '員林轉運站',
      address: '彰化縣員林市中山路二段556號',
      pickupTime: new Date('2024-01-15T08:00:00'),
      maxSeats: 45,
      bookedSeats: 45,
      coordinates: { lat: 23.9588, lng: 120.5736 }
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (useLiff as jest.Mock).mockReturnValue({
      profile: mockLiffProfile,
      isInLineClient: true
    });
    mockLocalStorage.getItem.mockReturnValue(null);
    (TransportService.getTransportOptions as jest.Mock).mockResolvedValue(mockTransportOptions);
    (TransportService.registerTransport as jest.Mock).mockResolvedValue({
      success: true,
      registrationId: 'reg-123',
      message: '交通車登記成功'
    });
  });

  it('completes full transport registration flow successfully', async () => {
    render(<TransportRegistrationPage />);

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText('選擇上車地點')).toBeInTheDocument();
    });

    // Step 1: Select a transport location
    await waitFor(() => {
      const changhuaStation = screen.getByText('彰化火車站').closest('.optionCard');
      expect(changhuaStation).toBeInTheDocument();
      fireEvent.click(changhuaStation!);
    });

    // Verify selection is saved to localStorage
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
      'transport-test-event-1',
      expect.stringContaining('"locationId":"location-1"')
    );

    // Step 2: Confirm selection to proceed to confirmation
    const confirmSelectionButton = screen.getByText('確認選擇');
    fireEvent.click(confirmSelectionButton);

    // Step 3: Verify confirmation page shows correct details
    await waitFor(() => {
      expect(screen.getByText('確認交通車登記')).toBeInTheDocument();
      expect(screen.getByText('彰化火車站')).toBeInTheDocument();
      expect(screen.getByText('彰化縣彰化市三民路1號')).toBeInTheDocument();
      expect(screen.getByText('07:30')).toBeInTheDocument();
      expect(screen.getByText('已預訂：33/45')).toBeInTheDocument();
    });

    // Step 4: Final confirmation
    const finalConfirmButton = screen.getByText('確認登記');
    fireEvent.click(finalConfirmButton);

    // Step 5: Verify API call and redirect
    await waitFor(() => {
      expect(TransportService.registerTransport).toHaveBeenCalledWith({
        eventId: 'test-event-1',
        userId: 'test-user-1',
        locationId: 'location-1',
        timestamp: expect.any(String)
      });
    }, { timeout: 3000 });

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/registration/confirmation?eventId=test-event-1');
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('transport-test-event-1');
    }, { timeout: 3000 });
  });

  it('completes flow with no transport selection', async () => {
    render(<TransportRegistrationPage />);

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText('選擇上車地點')).toBeInTheDocument();
    });

    // Step 1: Select no transport option
    await waitFor(() => {
      const noTransportCard = screen.getByText('不需要交通車').closest('.optionCard');
      fireEvent.click(noTransportCard!);
    });

    // Step 2: Confirm selection
    const confirmSelectionButton = screen.getByText('確認選擇');
    fireEvent.click(confirmSelectionButton);

    // Step 3: Verify no transport confirmation page
    await waitFor(() => {
      expect(screen.getByText('自行前往')).toBeInTheDocument();
      expect(screen.getByText('您選擇自行前往活動地點，請注意活動時間和地點資訊。')).toBeInTheDocument();
    });

    // Step 4: Final confirmation
    const finalConfirmButton = screen.getByText('確認登記');
    fireEvent.click(finalConfirmButton);

    // Step 5: Verify API call with null locationId
    await waitFor(() => {
      expect(TransportService.registerTransport).toHaveBeenCalledWith({
        eventId: 'test-event-1',
        userId: 'test-user-1',
        locationId: null,
        timestamp: expect.any(String)
      });
    }, { timeout: 3000 });
  });

  it('handles edit flow correctly', async () => {
    render(<TransportRegistrationPage />);

    // Initial selection
    await waitFor(() => {
      const changhuaStation = screen.getByText('彰化火車站').closest('.optionCard');
      fireEvent.click(changhuaStation!);
    });

    const confirmSelectionButton = screen.getByText('確認選擇');
    fireEvent.click(confirmSelectionButton);

    // Go to confirmation page
    await waitFor(() => {
      expect(screen.getByText('確認交通車登記')).toBeInTheDocument();
    });

    // Click edit to go back
    const editButton = screen.getByText('重新選擇');
    fireEvent.click(editButton);

    // Should be back to selection page
    await waitFor(() => {
      expect(screen.getByText('選擇上車地點')).toBeInTheDocument();
      const selectionStep = screen.getByText('選擇地點');
      expect(selectionStep).toHaveClass('active');
    });

    // Change selection
    await waitFor(() => {
      const lukanStreet = screen.getByText('鹿港老街').closest('.optionCard');
      fireEvent.click(lukanStreet!);
    });

    // Confirm new selection
    const newConfirmButton = screen.getByText('確認選擇');
    fireEvent.click(newConfirmButton);

    // Should show new selection in confirmation
    await waitFor(() => {
      expect(screen.getByText('鹿港老街')).toBeInTheDocument();
      expect(screen.getByText('彰化縣鹿港鎮中山路')).toBeInTheDocument();
    });
  });

  it('handles cancellation flow correctly', async () => {
    render(<TransportRegistrationPage />);

    // Make a selection and go to confirmation
    await waitFor(() => {
      const changhuaStation = screen.getByText('彰化火車站').closest('.optionCard');
      fireEvent.click(changhuaStation!);
    });

    const confirmSelectionButton = screen.getByText('確認選擇');
    fireEvent.click(confirmSelectionButton);

    await waitFor(() => {
      expect(screen.getByText('確認交通車登記')).toBeInTheDocument();
    });

    // Cancel the registration
    const cancelButton = screen.getByText('取消交通車登記');
    fireEvent.click(cancelButton);

    // Should redirect and clear localStorage
    expect(mockPush).toHaveBeenCalledWith('/events/test-event-1');
    expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('transport-test-event-1');
  });

  it('handles API errors gracefully', async () => {
    // Mock API error
    (TransportService.registerTransport as jest.Mock).mockRejectedValue(
      new Error('此交通車地點已額滿，請選擇其他地點')
    );

    render(<TransportRegistrationPage />);

    // Complete selection flow
    await waitFor(() => {
      const changhuaStation = screen.getByText('彰化火車站').closest('.optionCard');
      fireEvent.click(changhuaStation!);
    });

    const confirmSelectionButton = screen.getByText('確認選擇');
    fireEvent.click(confirmSelectionButton);

    await waitFor(() => {
      const finalConfirmButton = screen.getByText('確認登記');
      fireEvent.click(finalConfirmButton);
    });

    // Should show error message
    await waitFor(() => {
      expect(screen.getByText('交通車登記失敗，請稍後再試')).toBeInTheDocument();
    }, { timeout: 3000 });

    // Should not redirect on error
    expect(mockPush).not.toHaveBeenCalledWith('/registration/confirmation?eventId=test-event-1');
  });

  it('prevents selection of full locations', async () => {
    render(<TransportRegistrationPage />);

    await waitFor(() => {
      const yuanlinStation = screen.getByText('員林轉運站').closest('.optionCard');
      expect(yuanlinStation).toHaveClass('full');
      
      // Try to click full location
      fireEvent.click(yuanlinStation!);
    });

    // Should not save selection for full location
    expect(mockLocalStorage.setItem).not.toHaveBeenCalled();

    // Confirm button should show error if clicked without valid selection
    const confirmButton = screen.getByText('確認選擇');
    fireEvent.click(confirmButton);

    expect(screen.getByText('請選擇一個上車地點或選擇不需要交通車')).toBeInTheDocument();
  });

  it('restores saved selection from localStorage', async () => {
    const savedSelection = JSON.stringify({
      locationId: 'location-1',
      timestamp: '2024-01-15T10:00:00.000Z'
    });
    mockLocalStorage.getItem.mockReturnValue(savedSelection);

    render(<TransportRegistrationPage />);

    await waitFor(() => {
      expect(mockLocalStorage.getItem).toHaveBeenCalledWith('transport-test-event-1');
    });

    // Should show the saved selection as selected
    await waitFor(() => {
      const selectedCard = screen.getByText('彰化火車站').closest('.optionCard');
      expect(selectedCard).toHaveClass('selected');
    });
  });

  it('shows progress indicator correctly throughout flow', async () => {
    render(<TransportRegistrationPage />);

    // Initially should show 50% progress
    await waitFor(() => {
      const progressFill = document.querySelector('.progressFill');
      expect(progressFill).toHaveStyle('width: 50%');
      
      const selectionStep = screen.getByText('選擇地點');
      const confirmationStep = screen.getByText('確認登記');
      expect(selectionStep).toHaveClass('active');
      expect(confirmationStep).not.toHaveClass('active');
    });

    // Make selection and proceed
    await waitFor(() => {
      const changhuaStation = screen.getByText('彰化火車站').closest('.optionCard');
      fireEvent.click(changhuaStation!);
    });

    const confirmButton = screen.getByText('確認選擇');
    fireEvent.click(confirmButton);

    // Should show 100% progress
    await waitFor(() => {
      const progressFill = document.querySelector('.progressFill');
      expect(progressFill).toHaveStyle('width: 100%');
      
      const confirmationStep = screen.getByText('確認登記');
      expect(confirmationStep).toHaveClass('active');
    });
  });
});