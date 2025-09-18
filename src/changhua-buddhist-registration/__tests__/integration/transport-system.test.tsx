import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { TransportSelection } from '../../components/transport/TransportSelection';
import { TransportConfirmation } from '../../components/transport/TransportConfirmation';
import { TransportOption } from '../../types';

// Mock the transport service
jest.mock('../../services/transport', () => ({
  TransportService: {
    getTransportOptions: jest.fn(),
    updateSeatAvailability: jest.fn(),
    batchUpdateSeatAvailability: jest.fn(),
    checkLocationAvailability: jest.fn(),
    registerTransport: jest.fn(),
  }
}));

describe('Transport Registration System Integration', () => {
  const mockTransportOptions: TransportOption[] = [
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
  });

  it('displays transport options with seat availability', async () => {
    const mockProps = {
      eventId: 'test-event-1',
      selectedLocationId: null as string | null,
      onLocationSelect: jest.fn(),
      onConfirm: jest.fn(),
      loading: false,
      error: ''
    };

    render(<TransportSelection {...mockProps} />);

    // Wait for component to load and display options
    await waitFor(() => {
      expect(screen.getByText('選擇上車地點')).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByText('彰化火車站')).toBeInTheDocument();
      expect(screen.getByText('員林轉運站')).toBeInTheDocument();
    });

    // Check seat availability display
    expect(screen.getByText('剩餘 13 位')).toBeInTheDocument(); // 45 - 32
    expect(screen.getByText('已額滿')).toBeInTheDocument(); // 員林轉運站
  });

  it('handles location selection and shows confirmation', async () => {
    const mockProps = {
      eventId: 'test-event-1',
      selectedLocationId: null as string | null,
      onLocationSelect: jest.fn(),
      onConfirm: jest.fn(),
      loading: false,
      error: ''
    };

    render(<TransportSelection {...mockProps} />);

    await waitFor(() => {
      expect(screen.getByText('彰化火車站')).toBeInTheDocument();
    });

    // Select a location
    const changhuaCard = screen.getByText('彰化火車站').closest('div');
    if (changhuaCard) {
      fireEvent.click(changhuaCard);
    }

    expect(mockProps.onLocationSelect).toHaveBeenCalledWith('location-1');
  });

  it('shows confirmation details correctly', () => {
    const selectedTransport = mockTransportOptions[0];
    const mockProps = {
      selectedTransport,
      onEdit: jest.fn(),
      onConfirm: jest.fn(),
      onCancel: jest.fn(),
      loading: false
    };

    render(<TransportConfirmation {...mockProps} />);

    expect(screen.getByText('確認交通車登記')).toBeInTheDocument();
    expect(screen.getByText('彰化火車站')).toBeInTheDocument();
    expect(screen.getByText('彰化縣彰化市三民路1號')).toBeInTheDocument();
    expect(screen.getByText('07:30')).toBeInTheDocument();
    expect(screen.getByText('已預訂：33/45')).toBeInTheDocument(); // 32 + 1 (user)
  });

  it('handles no transport selection correctly', () => {
    const mockProps = {
      selectedTransport: null,
      onEdit: jest.fn(),
      onConfirm: jest.fn(),
      onCancel: jest.fn(),
      loading: false
    };

    render(<TransportConfirmation {...mockProps} />);

    expect(screen.getByText('自行前往')).toBeInTheDocument();
    expect(screen.getByText('您選擇自行前往活動地點，請注意活動時間和地點資訊。')).toBeInTheDocument();
  });

  it('shows alternative options when location is full', async () => {
    const mockProps = {
      eventId: 'test-event-1',
      selectedLocationId: null as string | null,
      onLocationSelect: jest.fn(),
      onConfirm: jest.fn(),
      loading: false,
      error: ''
    };

    render(<TransportSelection {...mockProps} />);

    await waitFor(() => {
      expect(screen.getByText('員林轉運站')).toBeInTheDocument();
    });

    // Check that full location shows alternatives
    const fullLocationMessage = screen.getByText('此地點已額滿，請選擇其他地點');
    expect(fullLocationMessage).toBeInTheDocument();
    
    // Should suggest alternative (彰化火車站 is available)
    expect(screen.getByText(/建議選擇：彰化火車站/)).toBeInTheDocument();
  });

  it('prevents selection of full locations', async () => {
    const mockProps = {
      eventId: 'test-event-1',
      selectedLocationId: null as string | null,
      onLocationSelect: jest.fn(),
      onConfirm: jest.fn(),
      loading: false,
      error: ''
    };

    render(<TransportSelection {...mockProps} />);

    await waitFor(() => {
      expect(screen.getByText('員林轉運站')).toBeInTheDocument();
    });

    // Try to click on full location
    const fullLocationCard = screen.getByText('員林轉運站').closest('div');
    if (fullLocationCard) {
      fireEvent.click(fullLocationCard);
    }

    // Should not call onLocationSelect for full location
    expect(mockProps.onLocationSelect).not.toHaveBeenCalled();
  });
});