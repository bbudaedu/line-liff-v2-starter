import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { TransportSelection } from '../../components/transport/TransportSelection';
import { TransportConfirmation } from '../../components/transport/TransportConfirmation';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { Alert } from '../../components/ui/Alert';
import { TransportOption } from '../../types';
import { TransportService } from '../../services/transport';
import { useLiff } from '../../hooks/useLiff';
import styles from './transport.module.css';

type TransportStep = 'selection' | 'confirmation';

const TransportRegistrationPage: React.FC = () => {
  const router = useRouter();
  const { eventId } = router.query;
  const { profile: liffProfile, isInLineClient } = useLiff();
  
  const [currentStep, setCurrentStep] = useState<TransportStep>('selection');
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
  const [selectedTransport, setSelectedTransport] = useState<TransportOption | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  // Mock transport options - in real implementation, this would come from API
  const mockTransportOptions: TransportOption[] = [
    {
      id: 'location-1',
      eventId: eventId as string,
      name: '彰化火車站',
      address: '彰化縣彰化市三民路1號',
      pickupTime: new Date('2024-01-15T07:30:00'),
      maxSeats: 45,
      bookedSeats: 32,
      coordinates: { lat: 24.0818, lng: 120.5387 }
    },
    {
      id: 'location-2',
      eventId: eventId as string,
      name: '員林轉運站',
      address: '彰化縣員林市中山路二段556號',
      pickupTime: new Date('2024-01-15T08:00:00'),
      maxSeats: 45,
      bookedSeats: 45,
      coordinates: { lat: 23.9588, lng: 120.5736 }
    },
    {
      id: 'location-3',
      eventId: eventId as string,
      name: '鹿港老街',
      address: '彰化縣鹿港鎮中山路',
      pickupTime: new Date('2024-01-15T07:45:00'),
      maxSeats: 35,
      bookedSeats: 28,
      coordinates: { lat: 24.0576, lng: 120.4342 }
    }
  ];

  useEffect(() => {
    if (!eventId) {
      router.push('/events');
      return;
    }

    const loadExistingRegistration = async () => {
      if (!liffProfile?.userId) return;

      try {
        // Check if user already has a transport registration
        const existingRegistration = await TransportService.getUserTransportRegistration(
          eventId as string, 
          liffProfile.userId
        );

        if (existingRegistration) {
          setSelectedLocationId(existingRegistration.locationId);
          if (existingRegistration.locationId) {
            const transport = mockTransportOptions.find(t => t.id === existingRegistration.locationId);
            setSelectedTransport(transport || null);
          }
          return;
        }
      } catch (error) {
        console.warn('Failed to load existing registration:', error);
      }

      // Fallback to localStorage
      const savedSelection = localStorage.getItem(`transport-${eventId}`);
      if (savedSelection) {
        try {
          const parsed = JSON.parse(savedSelection);
          setSelectedLocationId(parsed.locationId);
          if (parsed.locationId) {
            const transport = mockTransportOptions.find(t => t.id === parsed.locationId);
            setSelectedTransport(transport || null);
          }
        } catch (err) {
          console.error('Failed to parse saved transport selection:', err);
        }
      }
    };

    loadExistingRegistration();
  }, [eventId, router, liffProfile?.userId]);

  const handleLocationSelect = (locationId: string | null) => {
    setSelectedLocationId(locationId);
    setError('');
    
    if (locationId) {
      const transport = mockTransportOptions.find(t => t.id === locationId);
      setSelectedTransport(transport || null);
    } else {
      setSelectedTransport(null);
    }

    // Save selection to localStorage
    if (eventId) {
      localStorage.setItem(`transport-${eventId}`, JSON.stringify({
        locationId,
        timestamp: new Date().toISOString()
      }));
    }
  };

  const handleSelectionConfirm = () => {
    if (selectedLocationId === null || selectedTransport) {
      setCurrentStep('confirmation');
    } else {
      setError('請選擇一個上車地點或選擇不需要交通車');
    }
  };

  const handleEditSelection = () => {
    setCurrentStep('selection');
    setError('');
  };

  const handleFinalConfirm = async () => {
    if (!liffProfile?.userId) {
      setError('使用者資訊不完整，請重新登入');
      return;
    }

    try {
      setLoading(true);
      setError('');

      // Call the registration API
      const registrationData = {
        eventId: eventId as string,
        userId: liffProfile.userId,
        locationId: selectedLocationId,
        timestamp: new Date().toISOString()
      };

      const result = await TransportService.registerTransport(registrationData);

      if (result.success) {
        console.log('Transport registration confirmed:', {
          registrationId: result.registrationId,
          ...registrationData
        });

        // Clear saved selection
        if (eventId) {
          localStorage.removeItem(`transport-${eventId}`);
        }

        // Redirect to next step or confirmation page
        router.push(`/registration/confirmation?eventId=${eventId}`);
      } else {
        throw new Error(result.message || '交通車登記失敗');
      }
    } catch (err) {
      console.error('Transport registration error:', err);
      setError((err as Error).message || '交通車登記失敗，請稍後再試');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    // Clear saved selection
    if (eventId) {
      localStorage.removeItem(`transport-${eventId}`);
    }
    
    // Redirect back to event or registration flow
    router.push(`/events/${eventId}`);
  };

  if (!eventId) {
    return (
      <div className={styles.container}>
        <LoadingSpinner text="載入中..." />
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.progressIndicator}>
        <div className={styles.progressBar}>
          <div 
            className={styles.progressFill}
            style={{ width: currentStep === 'selection' ? '50%' : '100%' }}
          />
        </div>
        <div className={styles.progressSteps}>
          <div className={`${styles.step} ${styles.active}`}>
            選擇地點
          </div>
          <div className={`${styles.step} ${currentStep === 'confirmation' ? styles.active : ''}`}>
            確認登記
          </div>
        </div>
      </div>

      {error && (
        <Alert variant="error" className={styles.errorAlert}>{error}</Alert>
      )}

      {currentStep === 'selection' && (
        <TransportSelection
          eventId={eventId as string}
          selectedLocationId={selectedLocationId}
          onLocationSelect={handleLocationSelect}
          onConfirm={handleSelectionConfirm}
          loading={loading}
          error={error}
        />
      )}

      {currentStep === 'confirmation' && (
        <TransportConfirmation
          selectedTransport={selectedTransport}
          onEdit={handleEditSelection}
          onConfirm={handleFinalConfirm}
          onCancel={handleCancel}
          loading={loading}
        />
      )}
    </div>
  );
};

export default TransportRegistrationPage;