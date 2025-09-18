import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { Event, TransportOption, PageProps } from '@/types';
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner, Skeleton } from '@/components/ui/LoadingSpinner';
import { Alert } from '@/components/ui/Alert';
import { Container } from '@/components/layout/Grid';
import { useIdentity, useIdentityLabels } from '@/hooks/useIdentity';
import { apiClient, handleApiError } from '@/services/api';
import { formatDate, formatTime, isEventFull, isEventClosed } from '@/utils/helpers';

interface EventWithDetails extends Event {
  registrationStats: {
    total: number;
    monks: number;
    volunteers: number;
  };
}

export default function EventDetailsPage({ className, liffProfile, isInLineClient }: PageProps) {
  const router = useRouter();
  const { id } = router.query;
  const { identity, hasSelectedIdentity } = useIdentity();
  const { label: identityLabel } = useIdentityLabels(identity);
  
  const [event, setEvent] = useState<EventWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [registering, setRegistering] = useState(false);

  useEffect(() => {
    if (!hasSelectedIdentity) {
      router.push('/');
      return;
    }
    
    if (id && typeof id === 'string') {
      loadEventDetails(id);
    }
  }, [id, hasSelectedIdentity, router]);

  const loadEventDetails = async (eventId: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiClient.get<EventWithDetails>(`/api/v1/events/${eventId}`);
      
      if (response.success && response.data) {
        setEvent(response.data);
      } else {
        throw new Error(response.message || '無法載入活動詳情');
      }
    } catch (err) {
      const errorMessage = handleApiError(err);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleBackToEvents = () => {
    router.push('/events');
  };

  const handleStartRegistration = () => {
    if (!event) return;
    
    setRegistering(true);
    // 導向報名表單頁面（將在後續任務中實作）
    router.push(`/registration/${event.id}`);
  };

  const getEventStatusInfo = (event: EventWithDetails) => {
    if (isEventFull(event)) {
      return { 
        status: 'full', 
        text: '已額滿', 
        color: 'error',
        description: '此活動報名人數已達上限，無法再接受報名。'
      };
    }
    if (isEventClosed(event)) {
      return { 
        status: 'closed', 
        text: '報名截止', 
        color: 'warning',
        description: '此活動報名時間已截止，無法再進行報名。'
      };
    }
    
    const deadline = new Date(event.registrationDeadline);
    const now = new Date();
    const hoursUntilDeadline = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    if (hoursUntilDeadline <= 24 && hoursUntilDeadline > 0) {
      return { 
        status: 'closing-soon', 
        text: '即將截止', 
        color: 'warning',
        description: `報名將在 ${Math.ceil(hoursUntilDeadline)} 小時後截止，請盡快完成報名。`
      };
    }
    
    return { 
      status: 'open', 
      text: '開放報名', 
      color: 'success',
      description: '此活動目前開放報名，歡迎參加。'
    };
  };

  const getAvailableSeats = (event: EventWithDetails) => {
    return event.maxParticipants - event.currentParticipants;
  };

  const getProgressPercentage = (event: EventWithDetails) => {
    return Math.round((event.currentParticipants / event.maxParticipants) * 100);
  };

  if (loading) {
    return (
      <>
        <Head>
          <title>載入中 - 活動詳情</title>
        </Head>
        <Container className="event-details-page">
          <div className="page-header">
            <Skeleton height={40} width="30%" />
            <Skeleton height={32} width="70%" />
            <Skeleton height={20} width="50%" />
          </div>
          <div className="content-grid">
            <div className="main-content">
              <Card>
                <CardContent>
                  <Skeleton height={200} width="100%" />
                </CardContent>
              </Card>
            </div>
            <div className="sidebar">
              <Card>
                <CardContent>
                  <Skeleton height={150} width="100%" />
                </CardContent>
              </Card>
            </div>
          </div>
        </Container>
      </>
    );
  }

  if (error || !event) {
    return (
      <>
        <Head>
          <title>錯誤 - 活動詳情</title>
        </Head>
        <Container className="event-details-page">
          <div className="error-container">
            <Alert variant="error">
              <div className="error-content">
                <h3>載入活動詳情時發生錯誤</h3>
                <p>{error || '找不到指定的活動'}</p>
                <div className="error-actions">
                  <Button variant="outline" onClick={handleBackToEvents}>
                    返回活動列表
                  </Button>
                  <Button variant="primary" onClick={() => id && loadEventDetails(id as string)}>
                    重新載入
                  </Button>
                </div>
              </div>
            </Alert>
          </div>
        </Container>
      </>
    );
  }

  const statusInfo = getEventStatusInfo(event);
  const canRegister = statusInfo.status === 'open' || statusInfo.status === 'closing-soon';
  const availableSeats = getAvailableSeats(event);
  const progressPercentage = getProgressPercentage(event);

  return (
    <>
      <Head>
        <title>{event.name} - 活動詳情</title>
        <meta name="description" content={event.description} />
      </Head>

      <Container className={`event-details-page ${className || ''}`}>
        <header className="page-header">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleBackToEvents}
            className="back-button"
          >
            ← 返回活動列表
          </Button>
          
          <div className="header-content">
            <h1 className="event-title traditional-font">{event.name}</h1>
            <div className="event-meta">
              <span className={`event-status status-${statusInfo.color}`}>
                {statusInfo.text}
              </span>
              <span className="event-location rounded-font">
                📍 {event.location}
              </span>
            </div>
          </div>
        </header>

        <div className="content-grid">
          <main className="main-content">
            {/* 活動狀態提醒 */}
            <Alert 
              variant={statusInfo.color === 'error' ? 'error' : statusInfo.color === 'warning' ? 'warning' : 'info'}
              className="status-alert"
            >
              <div className="status-content">
                <h4>{statusInfo.text}</h4>
                <p>{statusInfo.description}</p>
              </div>
            </Alert>

            {/* 活動基本資訊 */}
            <Card className="event-info-card">
              <CardHeader>
                <h2 className="section-title traditional-font">活動資訊</h2>
              </CardHeader>
              <CardContent>
                <div className="info-grid">
                  <div className="info-item">
                    <div className="info-icon">📅</div>
                    <div className="info-content">
                      <h4>活動日期</h4>
                      <p>{formatDate(event.startDate)}</p>
                    </div>
                  </div>
                  
                  <div className="info-item">
                    <div className="info-icon">🕐</div>
                    <div className="info-content">
                      <h4>活動時間</h4>
                      <p>{formatTime(event.startDate)} - {formatTime(event.endDate)}</p>
                    </div>
                  </div>
                  
                  <div className="info-item">
                    <div className="info-icon">📍</div>
                    <div className="info-content">
                      <h4>活動地點</h4>
                      <p>{event.location}</p>
                    </div>
                  </div>
                  
                  <div className="info-item">
                    <div className="info-icon">⏰</div>
                    <div className="info-content">
                      <h4>報名截止</h4>
                      <p>{formatDate(event.registrationDeadline)}</p>
                    </div>
                  </div>
                </div>
                
                {event.description && (
                  <div className="event-description">
                    <h4>活動說明</h4>
                    <p className="rounded-font">{event.description}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 交通車資訊 */}
            {event.transportOptions && event.transportOptions.length > 0 && (
              <Card className="transport-card">
                <CardHeader>
                  <h2 className="section-title traditional-font">交通車資訊</h2>
                </CardHeader>
                <CardContent>
                  <div className="transport-grid">
                    {event.transportOptions.map((transport) => (
                      <div key={transport.id} className="transport-item">
                        <div className="transport-header">
                          <h4 className="transport-name">{transport.name}</h4>
                          <span className="transport-seats">
                            {transport.bookedSeats}/{transport.maxSeats} 人
                          </span>
                        </div>
                        <div className="transport-details">
                          <p className="transport-address">📍 {transport.address}</p>
                          <p className="transport-time">🕐 {formatTime(transport.pickupTime)}</p>
                        </div>
                        <div className="transport-progress">
                          <div 
                            className="progress-bar"
                            style={{ 
                              width: `${Math.round((transport.bookedSeats / transport.maxSeats) * 100)}%` 
                            }}
                          />
                        </div>
                        {transport.bookedSeats >= transport.maxSeats && (
                          <span className="transport-full">已額滿</span>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </main>

          <aside className="sidebar">
            {/* 報名狀態卡片 */}
            <Card className="registration-card">
              <CardHeader>
                <h3 className="traditional-font">報名狀態</h3>
              </CardHeader>
              <CardContent>
                <div className="registration-stats">
                  <div className="stat-item">
                    <span className="stat-number">{event.currentParticipants}</span>
                    <span className="stat-label">已報名</span>
                  </div>
                  <div className="stat-divider">/</div>
                  <div className="stat-item">
                    <span className="stat-number">{event.maxParticipants}</span>
                    <span className="stat-label">總名額</span>
                  </div>
                </div>
                
                <div className="progress-container">
                  <div className="progress-info">
                    <span>報名進度</span>
                    <span>{progressPercentage}%</span>
                  </div>
                  <div className="progress-bar-container">
                    <div 
                      className="progress-bar"
                      style={{ width: `${progressPercentage}%` }}
                    />
                  </div>
                  <p className="remaining-seats">
                    剩餘 {availableSeats} 個名額
                  </p>
                </div>

                <div className="identity-stats">
                  <h4>報名統計</h4>
                  <div className="stats-grid">
                    <div className="stats-item">
                      <span className="stats-icon">🧘‍♂️</span>
                      <span className="stats-text">法師：{event.registrationStats.monks} 人</span>
                    </div>
                    <div className="stats-item">
                      <span className="stats-icon">🙏</span>
                      <span className="stats-text">志工：{event.registrationStats.volunteers} 人</span>
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button 
                  variant={canRegister ? 'primary' : 'outline'}
                  fullWidth
                  disabled={!canRegister}
                  loading={registering}
                  onClick={handleStartRegistration}
                >
                  {canRegister ? `以${identityLabel}身份報名` : statusInfo.text}
                </Button>
              </CardFooter>
            </Card>

            {/* 使用者資訊卡片 */}
            {liffProfile && (
              <Card className="user-card">
                <CardContent>
                  <div className="user-info">
                    {liffProfile.pictureUrl && (
                      <img 
                        src={liffProfile.pictureUrl} 
                        alt="使用者頭像"
                        className="user-avatar"
                      />
                    )}
                    <div className="user-details">
                      <h4 className="user-name traditional-font">
                        {liffProfile.displayName}
                      </h4>
                      <p className="user-identity rounded-font">
                        {identityLabel}身份
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </aside>
        </div>
      </Container>

      <style jsx>{`
        .event-details-page {
          min-height: 100vh;
          background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
          padding-bottom: 40px;
        }

        .page-header {
          background: linear-gradient(135deg, var(--primary-color) 0%, var(--secondary-color) 100%);
          color: white;
          padding: 20px 0 30px;
          margin-bottom: 30px;
          position: relative;
        }

        .back-button {
          color: white;
          border-color: rgba(255, 255, 255, 0.3);
          margin-bottom: 16px;
        }

        .back-button:hover {
          background: rgba(255, 255, 255, 0.1);
          border-color: rgba(255, 255, 255, 0.5);
        }

        .header-content {
          text-align: center;
        }

        .event-title {
          font-size: 32px;
          font-weight: 900;
          margin-bottom: 12px;
          line-height: 1.2;
        }

        .event-meta {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 20px;
          flex-wrap: wrap;
        }

        .event-status {
          padding: 6px 16px;
          border-radius: 16px;
          font-size: 14px;
          font-weight: 600;
        }

        .status-success {
          background: rgba(76, 175, 80, 0.2);
          color: #2e7d32;
        }

        .status-warning {
          background: rgba(255, 152, 0, 0.2);
          color: #f57c00;
        }

        .status-error {
          background: rgba(244, 67, 54, 0.2);
          color: #d32f2f;
        }

        .event-location {
          font-size: 16px;
          opacity: 0.9;
        }

        .content-grid {
          display: grid;
          grid-template-columns: 1fr 350px;
          gap: 30px;
          align-items: start;
        }

        .main-content {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .sidebar {
          display: flex;
          flex-direction: column;
          gap: 20px;
          position: sticky;
          top: 20px;
        }

        .status-alert {
          margin-bottom: 0;
        }

        .status-content h4 {
          margin: 0 0 8px 0;
          font-size: 16px;
          font-weight: 600;
        }

        .status-content p {
          margin: 0;
          font-size: 14px;
          line-height: 1.4;
        }

        .section-title {
          font-size: 20px;
          font-weight: 700;
          color: var(--text-primary);
          margin: 0;
        }

        .info-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 20px;
          margin-bottom: 24px;
        }

        .info-item {
          display: flex;
          align-items: flex-start;
          gap: 12px;
        }

        .info-icon {
          font-size: 20px;
          width: 24px;
          text-align: center;
          flex-shrink: 0;
          margin-top: 2px;
        }

        .info-content h4 {
          font-size: 14px;
          font-weight: 600;
          color: var(--text-secondary);
          margin: 0 0 4px 0;
        }

        .info-content p {
          font-size: 16px;
          color: var(--text-primary);
          margin: 0;
          line-height: 1.4;
        }

        .event-description {
          border-top: 1px solid var(--border-light);
          padding-top: 20px;
        }

        .event-description h4 {
          font-size: 16px;
          font-weight: 600;
          color: var(--text-primary);
          margin: 0 0 12px 0;
        }

        .event-description p {
          font-size: 15px;
          color: var(--text-secondary);
          line-height: 1.6;
          margin: 0;
        }

        .transport-grid {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .transport-item {
          border: 1px solid var(--border-light);
          border-radius: 12px;
          padding: 16px;
          position: relative;
        }

        .transport-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }

        .transport-name {
          font-size: 16px;
          font-weight: 600;
          color: var(--text-primary);
          margin: 0;
        }

        .transport-seats {
          font-size: 14px;
          color: var(--text-secondary);
          font-weight: 500;
        }

        .transport-details {
          margin-bottom: 12px;
        }

        .transport-address,
        .transport-time {
          font-size: 14px;
          color: var(--text-secondary);
          margin: 4px 0;
        }

        .transport-progress {
          height: 4px;
          background: var(--border-light);
          border-radius: 2px;
          overflow: hidden;
        }

        .transport-progress .progress-bar {
          height: 100%;
          background: var(--primary-color);
          transition: width 0.3s ease;
        }

        .transport-full {
          position: absolute;
          top: 12px;
          right: 12px;
          background: #ffebee;
          color: #d32f2f;
          padding: 2px 8px;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 600;
        }

        .registration-stats {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 16px;
          margin-bottom: 20px;
        }

        .stat-item {
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .stat-number {
          font-size: 32px;
          font-weight: 900;
          color: var(--primary-color);
          line-height: 1;
        }

        .stat-label {
          font-size: 14px;
          color: var(--text-secondary);
          margin-top: 4px;
        }

        .stat-divider {
          font-size: 24px;
          color: var(--text-secondary);
          font-weight: 300;
        }

        .progress-container {
          margin-bottom: 20px;
        }

        .progress-info {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
          font-size: 14px;
          color: var(--text-secondary);
        }

        .progress-bar-container {
          height: 8px;
          background: var(--border-light);
          border-radius: 4px;
          overflow: hidden;
          margin-bottom: 8px;
        }

        .progress-bar-container .progress-bar {
          height: 100%;
          background: linear-gradient(90deg, var(--primary-color), var(--accent-color));
          transition: width 0.3s ease;
        }

        .remaining-seats {
          font-size: 14px;
          color: var(--text-secondary);
          text-align: center;
          margin: 0;
        }

        .identity-stats {
          border-top: 1px solid var(--border-light);
          padding-top: 16px;
        }

        .identity-stats h4 {
          font-size: 14px;
          font-weight: 600;
          color: var(--text-secondary);
          margin: 0 0 12px 0;
        }

        .stats-grid {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .stats-item {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .stats-icon {
          font-size: 16px;
          width: 20px;
          text-align: center;
        }

        .stats-text {
          font-size: 14px;
          color: var(--text-secondary);
        }

        .user-info {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .user-avatar {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          object-fit: cover;
          border: 2px solid var(--accent-color);
        }

        .user-name {
          font-size: 16px;
          font-weight: 600;
          color: var(--text-primary);
          margin: 0 0 4px 0;
        }

        .user-identity {
          font-size: 14px;
          color: var(--text-secondary);
          margin: 0;
        }

        .error-container {
          padding: 40px 0;
        }

        .error-content {
          text-align: center;
        }

        .error-content h3 {
          font-size: 20px;
          margin: 0 0 12px 0;
        }

        .error-content p {
          font-size: 16px;
          margin: 0 0 24px 0;
        }

        .error-actions {
          display: flex;
          gap: 12px;
          justify-content: center;
        }

        /* 響應式設計 */
        @media (max-width: 1024px) {
          .content-grid {
            grid-template-columns: 1fr;
            gap: 20px;
          }

          .sidebar {
            position: static;
            order: -1;
          }
        }

        @media (max-width: 768px) {
          .page-header {
            padding: 16px 0 24px;
            margin-bottom: 20px;
          }

          .event-title {
            font-size: 24px;
          }

          .event-meta {
            flex-direction: column;
            gap: 12px;
          }

          .info-grid {
            grid-template-columns: 1fr;
            gap: 16px;
          }

          .transport-grid {
            gap: 12px;
          }

          .transport-item {
            padding: 12px;
          }

          .registration-stats {
            gap: 12px;
          }

          .stat-number {
            font-size: 28px;
          }
        }

        @media (max-width: 480px) {
          .event-title {
            font-size: 20px;
          }

          .info-item {
            flex-direction: column;
            gap: 8px;
          }

          .info-icon {
            align-self: flex-start;
          }

          .transport-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 4px;
          }

          .user-info {
            flex-direction: column;
            text-align: center;
          }

          .error-actions {
            flex-direction: column;
            align-items: center;
          }
        }
      `}</style>
    </>
  );
}