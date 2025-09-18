import React, { useState } from 'react';
import { NextPage } from 'next';
import {
  Button,
  Input,
  Card,
  CardHeader,
  CardContent,
  CardFooter,
  LoadingSpinner,
  Skeleton,
  LoadingDots,
  Alert,
  Toast,
  Container,
  Grid,
  GridItem,
  Flex
} from '../components';

const DemoPage: NextPage = () => {
  const [showToast, setShowToast] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLoadingDemo = () => {
    setLoading(true);
    setTimeout(() => setLoading(false), 3000);
  };

  const handleToastDemo = () => {
    setShowToast(true);
  };

  return (
    <Container maxWidth="lg" padding="lg">
      <div style={{ marginBottom: '2rem' }}>
        <h1 className="gradient-text decorated-title">UI 元件展示</h1>
        <p style={{ fontSize: '18px', color: 'var(--text-secondary)', marginBottom: '2rem' }}>
          彰化供佛齋僧活動報名系統的響應式 UI 元件庫展示
        </p>
      </div>

      {/* 按鈕展示 */}
      <Card variant="gradient" padding="lg" style={{ marginBottom: '2rem' }}>
        <CardHeader>
          <h2>按鈕元件 (Button)</h2>
          <p>支援多種樣式、尺寸和狀態的按鈕元件</p>
        </CardHeader>
        <CardContent>
          <Grid columns={2} gap="lg" responsive>
            <GridItem>
              <h3>樣式變體</h3>
              <Flex direction="column" gap="md">
                <Button variant="primary">主要按鈕</Button>
                <Button variant="secondary">次要按鈕</Button>
                <Button variant="outline">輪廓按鈕</Button>
                <Button variant="ghost">幽靈按鈕</Button>
              </Flex>
            </GridItem>
            <GridItem>
              <h3>尺寸和狀態</h3>
              <Flex direction="column" gap="md">
                <Button size="sm">小按鈕</Button>
                <Button size="md">中按鈕</Button>
                <Button size="lg">大按鈕</Button>
                <Button loading onClick={handleLoadingDemo}>
                  {loading ? '載入中...' : '載入示範'}
                </Button>
              </Flex>
            </GridItem>
          </Grid>
        </CardContent>
      </Card>

      {/* 輸入框展示 */}
      <Card variant="gradient" padding="lg" style={{ marginBottom: '2rem' }}>
        <CardHeader>
          <h2>輸入框元件 (Input)</h2>
          <p>支援標籤、錯誤提示、圖示的輸入框元件</p>
        </CardHeader>
        <CardContent>
          <Grid columns={2} gap="lg" responsive>
            <GridItem>
              <Input
                label="姓名"
                placeholder="請輸入您的姓名"
                required
                fullWidth
              />
              <Input
                label="電話號碼"
                type="tel"
                placeholder="0912-345-678"
                helperText="請輸入手機號碼"
                startIcon="📞"
                fullWidth
              />
            </GridItem>
            <GridItem>
              <Input
                label="電子郵件"
                type="email"
                placeholder="example@email.com"
                error="請輸入有效的電子郵件地址"
                endIcon="✉️"
                fullWidth
              />
              <Input
                label="特殊需求"
                placeholder="請描述您的特殊需求..."
                helperText="選填項目"
                fullWidth
              />
            </GridItem>
          </Grid>
        </CardContent>
      </Card>

      {/* 卡片展示 */}
      <Card variant="gradient" padding="lg" style={{ marginBottom: '2rem' }}>
        <CardHeader>
          <h2>卡片元件 (Card)</h2>
          <p>支援多種樣式和佈局的卡片容器</p>
        </CardHeader>
        <CardContent>
          <Grid columns={3} gap="lg" responsive>
            <Card variant="default" hoverable>
              <CardHeader>
                <h3>預設卡片</h3>
              </CardHeader>
              <CardContent>
                <p>這是一個預設樣式的卡片，具有懸停效果。</p>
              </CardContent>
            </Card>

            <Card variant="elevated" clickable onClick={() => alert('卡片被點擊！')}>
              <CardHeader>
                <h3>立體卡片</h3>
              </CardHeader>
              <CardContent>
                <p>這是一個立體樣式的可點擊卡片。</p>
              </CardContent>
            </Card>

            <Card variant="outlined">
              <CardHeader>
                <h3>輪廓卡片</h3>
              </CardHeader>
              <CardContent>
                <p>這是一個輪廓樣式的卡片。</p>
              </CardContent>
              <CardFooter>
                <Button size="sm" variant="outline">操作</Button>
              </CardFooter>
            </Card>
          </Grid>
        </CardContent>
      </Card>

      {/* 載入動畫展示 */}
      <Card variant="gradient" padding="lg" style={{ marginBottom: '2rem' }}>
        <CardHeader>
          <h2>載入動畫元件</h2>
          <p>多種載入動畫和骨架屏效果</p>
        </CardHeader>
        <CardContent>
          <Grid columns={3} gap="lg" responsive>
            <GridItem>
              <h3>載入轉圈</h3>
              <Flex direction="column" gap="md" align="center">
                <LoadingSpinner size="sm" variant="primary" />
                <LoadingSpinner size="md" variant="secondary" />
                <LoadingSpinner size="lg" variant="accent" text="載入中..." />
              </Flex>
            </GridItem>
            
            <GridItem>
              <h3>載入點</h3>
              <Flex direction="column" gap="md" align="center">
                <LoadingDots size="sm" variant="primary" />
                <LoadingDots size="md" variant="secondary" />
                <LoadingDots size="lg" variant="accent" />
              </Flex>
            </GridItem>
            
            <GridItem>
              <h3>骨架屏</h3>
              <Flex direction="column" gap="md">
                <Skeleton width="100%" height="20px" />
                <Skeleton width="80%" height="16px" />
                <Skeleton width="60%" height="16px" />
                <Skeleton variant="circular" width="50px" height="50px" />
                <Skeleton variant="rectangular" width="100%" height="100px" />
              </Flex>
            </GridItem>
          </Grid>
        </CardContent>
      </Card>

      {/* 提示訊息展示 */}
      <Card variant="gradient" padding="lg" style={{ marginBottom: '2rem' }}>
        <CardHeader>
          <h2>提示訊息元件 (Alert)</h2>
          <p>不同類型的提示訊息和 Toast 通知</p>
        </CardHeader>
        <CardContent>
          <Flex direction="column" gap="md">
            <Alert variant="success" title="成功">
              您的報名已成功提交！
            </Alert>
            
            <Alert variant="info" title="資訊">
              請注意活動時間和地點。
            </Alert>
            
            <Alert variant="warning" title="警告" closable>
              報名即將截止，請盡快完成。
            </Alert>
            
            <Alert variant="error" title="錯誤" closable>
              網路連線失敗，請重新嘗試。
            </Alert>
          </Flex>
          
          <div style={{ marginTop: '1rem' }}>
            <Button onClick={handleToastDemo}>顯示 Toast 通知</Button>
          </div>
        </CardContent>
      </Card>

      {/* 佈局展示 */}
      <Card variant="gradient" padding="lg" style={{ marginBottom: '2rem' }}>
        <CardHeader>
          <h2>佈局元件</h2>
          <p>響應式網格和彈性佈局系統</p>
        </CardHeader>
        <CardContent>
          <h3>網格佈局 (Grid)</h3>
          <Grid columns={4} gap="md" responsive style={{ marginBottom: '2rem' }}>
            {[1, 2, 3, 4, 5, 6, 7, 8].map(num => (
              <Card key={num} variant="outlined" padding="sm">
                <div style={{ textAlign: 'center', padding: '1rem' }}>
                  項目 {num}
                </div>
              </Card>
            ))}
          </Grid>
          
          <h3>彈性佈局 (Flex)</h3>
          <Flex justify="between" align="center" gap="md" style={{ 
            padding: '1rem', 
            background: 'var(--surface-elevated)', 
            borderRadius: 'var(--border-radius-md)' 
          }}>
            <div>左側內容</div>
            <div>中間內容</div>
            <div>右側內容</div>
          </Flex>
        </CardContent>
      </Card>

      {/* 佛教風格展示 */}
      <Card variant="gradient" padding="lg" className="decorative-element">
        <CardHeader>
          <h2 className="traditional-font">佛教風格設計</h2>
          <p className="rounded-font">融入佛教元素的設計風格</p>
        </CardHeader>
        <CardContent>
          <Flex direction="column" gap="lg">
            <div style={{ 
              padding: '2rem', 
              background: 'var(--primary-gradient)',
              borderRadius: 'var(--border-radius-xl)',
              color: 'white',
              textAlign: 'center',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <h3 className="traditional-font" style={{ marginBottom: '1rem' }}>
                🪷 南無阿彌陀佛 🪷
              </h3>
              <p className="rounded-font">
                慈悲喜捨，普度眾生
              </p>
            </div>
            
            <Grid columns={2} gap="lg" responsive>
              <Card variant="outlined" padding="lg">
                <h4 className="traditional-font">法師報名</h4>
                <p className="rounded-font">專為法師設計的報名流程</p>
                <div style={{ marginTop: '1rem' }}>
                  <Button variant="primary" fullWidth>
                    🙏 法師報名
                  </Button>
                </div>
              </Card>
              
              <Card variant="outlined" padding="lg">
                <h4 className="traditional-font">志工報名</h4>
                <p className="rounded-font">歡迎志工菩薩共同參與</p>
                <div style={{ marginTop: '1rem' }}>
                  <Button variant="secondary" fullWidth>
                    🤝 志工報名
                  </Button>
                </div>
              </Card>
            </Grid>
          </Flex>
        </CardContent>
      </Card>

      {/* Toast 通知 */}
      <Toast
        visible={showToast}
        variant="success"
        title="成功"
        position="top"
        duration={3000}
        onClose={() => setShowToast(false)}
      >
        這是一個 Toast 通知示範！
      </Toast>

      {/* 全屏載入示範 */}
      {loading && (
        <LoadingSpinner
          fullScreen
          size="lg"
          variant="primary"
          text="正在載入，請稍候..."
        />
      )}
    </Container>
  );
};

export default DemoPage;