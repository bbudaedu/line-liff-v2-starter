import React from 'react';
import Head from 'next/head';
import { ErrorPage } from '../components/error/ErrorPage';

export default function Custom500() {
  return (
    <>
      <Head>
        <title>伺服器錯誤 - 彰化供佛齋僧活動報名系統</title>
        <meta name="description" content="伺服器發生內部錯誤" />
      </Head>
      <ErrorPage 
        statusCode={500}
        onHome={() => window.location.href = '/'}
      />
    </>
  );
}