/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface RecoveryEmailProps {
  siteName: string
  confirmationUrl: string
  token?: string
}

export const RecoveryEmail = ({
  siteName,
  confirmationUrl,
  token,
}: RecoveryEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Reset your password for {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Reset your password</Heading>
        <Text style={text}>
          We received a request to reset your password for {siteName}. Click
          the button below, then enter the verification code shown in this email
          to choose a new password.
        </Text>
        {token && (
          <Container style={codeBox}>
            <Text style={codeLabel}>Password reset code</Text>
            <Text style={codeText}>{token}</Text>
          </Container>
        )}
        <Button style={button} href={confirmationUrl}>
          Reset Password
        </Button>
        <Text style={smallText}>
          This code is single-use. The button is safe to open even if your email
          app previews links, because the code is only checked after you enter it.
        </Text>
        <Text style={footer}>
          If you didn't request a password reset, you can safely ignore this
          email. Your password will not be changed.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default RecoveryEmail

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '20px 25px' }
const h1 = {
  fontSize: '22px',
  fontWeight: 'bold' as const,
  color: '#000000',
  margin: '0 0 20px',
}
const text = {
  fontSize: '14px',
  color: '#55575d',
  lineHeight: '1.5',
  margin: '0 0 25px',
}
const codeBox = {
  backgroundColor: '#f8fafc',
  border: '1px solid #cbd5e1',
  borderRadius: '8px',
  padding: '14px 16px',
  margin: '0 0 22px',
}
const codeLabel = {
  fontSize: '12px',
  color: '#475569',
  margin: '0 0 6px',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
  fontWeight: 'bold' as const,
}
const codeText = {
  fontSize: '26px',
  color: '#0f172a',
  margin: '0',
  letterSpacing: '4px',
  fontWeight: 'bold' as const,
  fontFamily: 'Arial, sans-serif',
}
const button = {
  backgroundColor: '#000000',
  color: '#ffffff',
  fontSize: '14px',
  borderRadius: '8px',
  padding: '12px 20px',
  textDecoration: 'none',
}
const smallText = {
  fontSize: '12px',
  color: '#64748b',
  lineHeight: '1.5',
  margin: '18px 0 0',
}
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0' }
