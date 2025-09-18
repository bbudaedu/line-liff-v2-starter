import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useRouter } from 'next/router';
import TransportRegistrationPage from '../../../pages/registration/transport';
import { useLiff } from '../../../hooks/useLiff';

// Mock Next.js router
jest.mock('next/router', () => ({
  useRouter: jest.fn()
}));

// Mock LIFF hook
jest.mock('../../../hooks/useLiff', () => ({
  useLiff: jest.fn()
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

describe('TransportRegistrationPage', () => {
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

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (useLiff as jest.Mock).mockReturnValue({
      liffProfile: mockLiffProfile,
      isInLineClient: true
    });
    mockLocalStorage.getItem.mockReturnValue(null);
  });

  it('renders transport registration page correctly', async () => {
    render(<TransportRegistrationPage />);
    
    await waitFor(() => {
      expect(screen.getByText('選擇地點')).toBeInTheDocument();
      expect(screen.getByText('確認登記')).toBeInTheDocument();
    });
  });

  it('shows progress indicator correctly', async () => {
    render(<TransportRegistrationPage />);
    
    await waitFor(() => {
      const selectionStep = screen.getByText('選擇地點');
      const confirmationStep = screen.getByText('確認登記');
      
      expect(selectionStep).toHaveClass('active');
      expect(confirmationStep).not.toHaveClass('active');
    });
  });

  it('redirects to events page when eventId is missing', () => {
    const routerWithoutEventId = {
      ...mockRouter,
      query: {}
    };
    (useRouter as jest.Mock).mockReturnValue(routerWithoutEventId);

    render(<TransportRegistrationPage />);
    
    expect(mockPush).toHaveBeenCalledWith('/events');
  });

  it('loads saved transport selection from localStorage', async () => {
    const savedSelection = JSON.stringify({
      locationId: 'location-1',
      timestamp: '2024-01-15T10:00:00.000Z'
    });
    mockLocalStorage.getItem.mockReturnValue(savedSelection);

    render(<TransportRegistrationPage />);
    
    await waitFor(() => {
      expect(mockLocalStorage.getItem).toHaveBeenCalledWith('transport-test-event-1');
    });
  });

  it('handles location selection and saves to localStorage', async () => {
    render(<TransportRegistrationPage />);
    
    await waitFor(() => {
      const changhuaStation = screen.getByText('彰化火車站').closest('.optionCard');
      fireEvent.click(changhuaStation!);
    });

    expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
      'transport-test-event-1',
      expect.stringContaining('"locationId":"location-1"')
    );
  });

  it('progresses to confirmation step after selection', async () => {
    render(<TransportRegistrationPage />);
    
    await waitFor(() => {
      const changhuaStation = screen.getByText('彰化火車站').closest('.optionCard');
      fireEvent.click(changhuaStation!);
    });

    const confirmButton = screen.getByText('確認選擇');
    fireEvent.click(confirmButton);

    await waitFor(() => {
      const confirmationStep = screen.getByText('確認登記');
      expect(confirmationStep).toHaveClass('active');
    });
  });

  it('shows error when trying to confirm without selection', async () => {
    render(<TransportRegistrationPage />);
    
    await waitFor(() => {
      const confirmButton = screen.getByText('確認選擇');
      fireEvent.click(confirmButton);
    });

    expect(screen.getByText('請選擇一個上車地點或選擇不需要交通車')).toBeInTheDocument();
  });

  it('allows confirmation with no transport selection', async () => {
    render(<TransportRegistrationPage />);
    
    await waitFor(() => {
      const noTransportCard = screen.getByText('不需要交通車').closest('.optionCard');
      fireEvent.click(noTransportCard!);
    });

    const confirmButton = screen.getByText('確認選擇');
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(screen.getByText('自行前往')).toBeInTheDocument();
    });
  });

  it('handles edit selection from confirmation step', async () => {
    render(<TransportRegistrationPage />);
    
    // Select a location and go to confirmation
    await waitFor(() => {
      const changhuaStation = screen.getByText('彰化火車站').closest('.optionCard');
      fireEvent.click(changhuaStation!);
    });

    const confirmButton = screen.getByText('確認選擇');
    fireEvent.click(confirmButton);

    await waitFor(() => {
      const editButton = screen.getByText('重新選擇');
      fireEvent.click(editButton);
    });

    await waitFor(() => {
      const selectionStep = screen.getByText('選擇地點');
      expect(selectionStep).toHaveClass('active');
    });
  });

  it('handles final confirmation and redirects', async () => {
    render(<TransportRegistrationPage />);
    
    // Select a location and go to confirmation
    await waitFor(() => {
      const changhuaStation = screen.getByText('彰化火車站').closest('.optionCard');
      fireEvent.click(changhuaStation!);
    });

    const confirmButton = screen.getByText('確認選擇');
    fireEvent.click(confirmButton);

    await waitFor(() => {
      const finalConfirmButton = screen.getByText('確認登記');
      fireEvent.click(finalConfirmButton);
    });

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/registration/confirmation?eventId=test-event-1');
    }, { timeout: 3000 });
  });

  it('handles cancellation and redirects', async () => {
    render(<TransportRegistrationPage />);
    
    // Select a location and go to confirmation
    await waitFor(() => {
      const changhuaStation = screen.getByText('彰化火車站').closest('.optionCard');
      fireEvent.click(changhuaStation!);
    });

    const confirmButton = screen.getByText('確認選擇');
    fireEvent.click(confirmButton);

    await waitFor(() => {
      const cancelButton = screen.getByText('取消交通車登記');
      fireEvent.click(cancelButton);
    });

    expect(mockPush).toHaveBeenCalledWith('/events/test-event-1');
    expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('transport-test-event-1');
  });

  it('shows loading state during final confirmation', async () => {
    render(<TransportRegistrationPage />);
    
    // Select a location and go to confirmation
    await waitFor(() => {
      const changhuaStation = screen.getByText('彰化火車站').closest('.optionCard');
      fireEvent.click(changhuaStation!);
    });

    const confirmButton = screen.getByText('確認選擇');
    fireEvent.click(confirmButton);

    await waitFor(() => {
      const finalConfirmButton = screen.getByText('確認登記');
      fireEvent.click(finalConfirmButton);
    });

    // Button should be disabled during loading
    const loadingButton = screen.getByText('確認登記');
    expect(loadingButton).toBeDisabled();
  });

  it('clears localStorage after successful confirmation', async () => {
    render(<TransportRegistrationPage />);
    
    // Select a location and go to confirmation
    await waitFor(() => {
      const changhuaStation = screen.getByText('彰化火車站').closest('.optionCard');
      fireEvent.click(changhuaStation!);
    });

    const confirmButton = screen.getByText('確認選擇');
    fireEvent.click(confirmButton);

    await waitFor(() => {
      const finalConfirmButton = screen.getByText('確認登記');
      fireEvent.click(finalConfirmButton);
    });

    await waitFor(() => {
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('transport-test-event-1');
    }, { timeout: 3000 });
  });

  it('handles localStorage parsing errors gracefully', async () => {
    mockLocalStorage.getItem.mockReturnValue('invalid-json');
    
    // Should not throw error
    render(<TransportRegistrationPage />);
    
    await waitFor(() => {
      expect(screen.getByText('選擇地點')).toBeInTheDocument();
    });
  });

  it('updates progress bar correctly', async () => {
    render(<TransportRegistrationPage />);
    
    // Initially at 50%
    await waitFor(() => {
      const progressFill = document.querySelector('.progressFill');
      expect(progressFill).toHaveStyle('width: 50%');
    });

    // Select and confirm to go to confirmation step
    await waitFor(() => {
      const changhuaStation = screen.getByText('彰化火車站').closest('.optionCard');
      fireEvent.click(changhuaStation!);
    });

    const confirmButton = screen.getByText('確認選擇');
    fireEvent.click(confirmButton);

    await waitFor(() => {
      const progressFill = document.querySelector('.progressFill');
      expect(progressFill).toHaveStyle('width: 100%');
    });
  });
});