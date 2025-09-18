import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TransportSelection } from '../../../components/transport/TransportSelection';
import { TransportService } from '../../../services/transport';

// Mock the transport service
jest.mock('../../../services/transport', () => ({
  TransportService: {
    getTransportOptions: jest.fn(),
    updateSeatAvailability: jest.fn(),
    batchUpdateSeatAvailability: jest.fn(),
    checkLocationAvailability: jest.fn(),
  }
}));

describe('TransportSelection', () => {
  const mockProps = {
    eventId: 'test-event-1',
    selectedLocationId: null as string | null,
    onLocationSelect: jest.fn(),
    onConfirm: jest.fn(),
    loading: false,
    error: ''
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock the service methods
    (TransportService.batchUpdateSeatAvailability as jest.Mock).mockResolvedValue([]);
    (TransportService.checkLocationAvailability as jest.Mock).mockResolvedValue(true);
    (TransportService.updateSeatAvailability as jest.Mock).mockResolvedValue({});
  });

  it('renders transport selection interface correctly', async () => {
    render(<TransportSelection {...mockProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('選擇上車地點')).toBeInTheDocument();
      expect(screen.getByText('請選擇最方便的上車地點，我們將為您安排交通車')).toBeInTheDocument();
    });
  });

  it('displays transport options with correct information', async () => {
    render(<TransportSelection {...mockProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('彰化火車站')).toBeInTheDocument();
      expect(screen.getByText('員林轉運站')).toBeInTheDocument();
      expect(screen.getByText('鹿港老街')).toBeInTheDocument();
    });

    // Check seat availability display
    expect(screen.getByText('剩餘 13 位')).toBeInTheDocument(); // 45 - 32
    expect(screen.getByText('已額滿')).toBeInTheDocument(); // 員林轉運站
    expect(screen.getByText('剩餘 7 位')).toBeInTheDocument(); // 35 - 28
  });

  it('handles location selection correctly', async () => {
    render(<TransportSelection {...mockProps} />);
    
    await waitFor(() => {
      const changhuaStation = screen.getByText('彰化火車站').closest('.optionCard');
      expect(changhuaStation).toBeInTheDocument();
    });

    const changhuaCard = screen.getByText('彰化火車站').closest('.optionCard');
    fireEvent.click(changhuaCard!);

    expect(mockProps.onLocationSelect).toHaveBeenCalledWith('location-1');
  });

  it('prevents selection of full locations', async () => {
    render(<TransportSelection {...mockProps} />);
    
    await waitFor(() => {
      const yuanlinStation = screen.getByText('員林轉運站').closest('.optionCard');
      expect(yuanlinStation).toHaveClass('full');
    });

    const yuanlinCard = screen.getByText('員林轉運站').closest('.optionCard');
    fireEvent.click(yuanlinCard!);

    expect(mockProps.onLocationSelect).not.toHaveBeenCalled();
  });

  it('shows selected location correctly', async () => {
    const propsWithSelection = {
      ...mockProps,
      selectedLocationId: 'location-1'
    };

    render(<TransportSelection {...propsWithSelection} />);
    
    await waitFor(() => {
      const selectedCard = screen.getByText('彰化火車站').closest('.optionCard');
      expect(selectedCard).toHaveClass('selected');
      expect(screen.getByText('✓ 已選擇此地點')).toBeInTheDocument();
    });
  });

  it('handles no transport option selection', async () => {
    render(<TransportSelection {...mockProps} />);
    
    await waitFor(() => {
      const noTransportCard = screen.getByText('不需要交通車').closest('.optionCard');
      fireEvent.click(noTransportCard!);
    });

    expect(mockProps.onLocationSelect).toHaveBeenCalledWith(null);
  });

  it('shows no transport selection correctly', async () => {
    const propsWithNoTransport = {
      ...mockProps,
      selectedLocationId: null
    };

    render(<TransportSelection {...propsWithNoTransport} />);
    
    await waitFor(() => {
      const noTransportCard = screen.getByText('不需要交通車').closest('.optionCard');
      fireEvent.click(noTransportCard!);
    });

    expect(mockProps.onLocationSelect).toHaveBeenCalledWith(null);
  });

  it('handles confirm button click', async () => {
    render(<TransportSelection {...mockProps} />);
    
    await waitFor(() => {
      const confirmButton = screen.getByText('確認選擇');
      fireEvent.click(confirmButton);
    });

    expect(mockProps.onConfirm).toHaveBeenCalled();
  });

  it('disables confirm button when loading', async () => {
    const loadingProps = {
      ...mockProps,
      loading: true
    };

    render(<TransportSelection {...loadingProps} />);
    
    await waitFor(() => {
      const confirmButton = screen.getByText('確認選擇');
      expect(confirmButton).toBeDisabled();
    });
  });

  it('displays error message when provided', async () => {
    const errorProps = {
      ...mockProps,
      error: '網路連線錯誤'
    };

    render(<TransportSelection {...errorProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('網路連線錯誤')).toBeInTheDocument();
    });
  });

  it('formats time correctly', async () => {
    render(<TransportSelection {...mockProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('07:30')).toBeInTheDocument();
      expect(screen.getByText('08:00')).toBeInTheDocument();
      expect(screen.getByText('07:45')).toBeInTheDocument();
    });
  });

  it('shows loading state initially', () => {
    render(<TransportSelection {...mockProps} />);
    
    expect(screen.getByText('載入交通車資訊中...')).toBeInTheDocument();
  });

  it('allows deselection of selected location', async () => {
    const propsWithSelection = {
      ...mockProps,
      selectedLocationId: 'location-1'
    };

    render(<TransportSelection {...propsWithSelection} />);
    
    await waitFor(() => {
      const selectedCard = screen.getByText('彰化火車站').closest('.optionCard');
      fireEvent.click(selectedCard!);
    });

    expect(mockProps.onLocationSelect).toHaveBeenCalledWith(null);
  });

  it('displays seat information correctly', async () => {
    render(<TransportSelection {...mockProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('32/45 已預訂')).toBeInTheDocument();
      expect(screen.getByText('45/45 已預訂')).toBeInTheDocument();
      expect(screen.getByText('28/35 已預訂')).toBeInTheDocument();
    });
  });

  it('shows full location message', async () => {
    render(<TransportSelection {...mockProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('此地點已額滿，請選擇其他地點')).toBeInTheDocument();
    });
  });
});