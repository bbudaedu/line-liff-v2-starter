import React from 'react';
import { RegistrationStep, STEP_INFO, useRegistrationFlow } from '@/contexts/RegistrationFlowContext';
import styles from './RegistrationProgress.module.css';

interface RegistrationProgressProps {
  className?: string;
  showLabels?: boolean;
  compact?: boolean;
}

export function RegistrationProgress({ 
  className = '', 
  showLabels = true, 
  compact = false 
}: RegistrationProgressProps) {
  const { state, canGoToStep, goToStep } = useRegistrationFlow();
  const { currentStep, completedSteps } = state;

  const steps: RegistrationStep[] = ['identity', 'event', 'personal-info', 'transport', 'confirmation', 'success'];

  const getStepStatus = (step: RegistrationStep): 'completed' | 'current' | 'upcoming' | 'disabled' => {
    if (completedSteps.includes(step)) {
      return 'completed';
    }
    if (step === currentStep) {
      return 'current';
    }
    if (canGoToStep(step)) {
      return 'upcoming';
    }
    return 'disabled';
  };

  const handleStepClick = (step: RegistrationStep) => {
    if (canGoToStep(step) && step !== currentStep) {
      goToStep(step);
    }
  };

  const getStepNumber = (step: RegistrationStep): number => {
    return steps.indexOf(step) + 1;
  };

  const getProgressPercentage = (): number => {
    const currentIndex = steps.indexOf(currentStep);
    return (currentIndex / (steps.length - 1)) * 100;
  };

  return (
    <div className={`${styles.progressContainer} ${compact ? styles.compact : ''} ${className}`}>
      {/* 進度條 */}
      <div className={styles.progressBar}>
        <div 
          className={styles.progressFill}
          style={{ width: `${getProgressPercentage()}%` }}
        />
      </div>

      {/* 步驟指示器 */}
      <div className={styles.stepsContainer}>
        {steps.map((step, index) => {
          const status = getStepStatus(step);
          const stepInfo = STEP_INFO[step];
          const isClickable = canGoToStep(step) && step !== currentStep;

          return (
            <div
              key={step}
              className={`${styles.step} ${styles[status]} ${isClickable ? styles.clickable : ''}`}
              onClick={() => handleStepClick(step)}
            >
              {/* 步驟圓圈 */}
              <div className={styles.stepCircle}>
                {status === 'completed' ? (
                  <svg className={styles.checkIcon} viewBox="0 0 24 24" fill="none">
                    <path
                      d="M20 6L9 17L4 12"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                ) : (
                  <span className={styles.stepNumber}>{getStepNumber(step)}</span>
                )}
              </div>

              {/* 步驟標籤 */}
              {showLabels && !compact && (
                <div className={styles.stepLabel}>
                  <div className={styles.stepTitle}>{stepInfo.title}</div>
                  <div className={styles.stepDescription}>{stepInfo.description}</div>
                </div>
              )}

              {/* 簡化標籤（緊湊模式） */}
              {showLabels && compact && (
                <div className={styles.stepLabelCompact}>
                  {stepInfo.title}
                </div>
              )}

              {/* 連接線 */}
              {index < steps.length - 1 && (
                <div className={styles.stepConnector} />
              )}
            </div>
          );
        })}
      </div>

      {/* 進度文字 */}
      <div className={styles.progressText}>
        <span className={styles.currentStepText}>
          {STEP_INFO[currentStep].title}
        </span>
        <span className={styles.progressPercentage}>
          {Math.round(getProgressPercentage())}% 完成
        </span>
      </div>
    </div>
  );
}

// 簡化版進度條（只顯示百分比）
export function SimpleProgress({ className = '' }: { className?: string }) {
  const { getStepProgress } = useRegistrationFlow();
  const progress = getStepProgress();

  return (
    <div className={`${styles.simpleProgressContainer} ${className}`}>
      <div className={styles.simpleProgressBar}>
        <div 
          className={styles.simpleProgressFill}
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className={styles.simpleProgressText}>
        {progress}% 完成
      </div>
    </div>
  );
}

// 步驟導航按鈕
export function StepNavigation({ className = '' }: { className?: string }) {
  const { state, goToPreviousStep, goToNextStep, canGoToStep } = useRegistrationFlow();
  const { currentStep, completedSteps } = state;

  const steps: RegistrationStep[] = ['identity', 'event', 'personal-info', 'transport', 'confirmation', 'success'];
  const currentIndex = steps.indexOf(currentStep);
  
  const canGoBack = currentIndex > 0;
  const canGoForward = currentIndex < steps.length - 1 && completedSteps.includes(currentStep);

  return (
    <div className={`${styles.navigationContainer} ${className}`}>
      <button
        className={`${styles.navButton} ${styles.prevButton}`}
        onClick={goToPreviousStep}
        disabled={!canGoBack}
      >
        ← 上一步
      </button>

      <button
        className={`${styles.navButton} ${styles.nextButton}`}
        onClick={goToNextStep}
        disabled={!canGoForward}
      >
        下一步 →
      </button>
    </div>
  );
}

export default RegistrationProgress;