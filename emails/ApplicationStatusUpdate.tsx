import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components'
import * as React from 'react'

interface ApplicationStatusUpdateEmailProps {
  applicantName: string
  jobTitle: string
  company: string
  status: string
  dashboardUrl?: string
}

const getStatusMessage = (status: string) => {
  switch (status) {
    case 'shortlisted':
      return {
        emoji: '⭐',
        title: 'You\'ve Been Shortlisted!',
        message: 'Great news! The employer has shortlisted your application and is interested in learning more about you.',
      }
    case 'interviewed':
      return {
        emoji: '📅',
        title: 'Interview Scheduled',
        message: 'Congratulations! The employer would like to interview you for this position. They will contact you soon with more details.',
      }
    case 'rejected':
      return {
        emoji: '📋',
        title: 'Application Update',
        message: 'Thank you for your interest. Unfortunately, the employer has decided to move forward with other candidates at this time.',
      }
    case 'hired':
      return {
        emoji: '🎉',
        title: 'Congratulations!',
        message: 'Excellent news! You\'ve been selected for this position. The employer will reach out to you with next steps.',
      }
    default:
      return {
        emoji: '📬',
        title: 'Application Status Updated',
        message: 'Your application status has been updated by the employer.',
      }
  }
}

export const ApplicationStatusUpdateEmail = ({
  applicantName,
  jobTitle,
  company,
  status,
  dashboardUrl = 'https://field-jobs.co/dashboard',
}: ApplicationStatusUpdateEmailProps) => {
  const statusInfo = getStatusMessage(status)
  
  return (
    <Html>
      <Head />
      <Preview>{statusInfo.title} - {jobTitle} at {company}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Heading style={h1}>⚙️ FieldJobs</Heading>
          </Section>
          
          <Section style={content}>
            <Text style={emojiStyle}>{statusInfo.emoji}</Text>
            <Heading style={h2}>{statusInfo.title}</Heading>
            
            <Text style={text}>
              Hi {applicantName},
            </Text>
            
            <Text style={text}>
              {statusInfo.message}
            </Text>
            
            <Section style={infoBox}>
              <Text style={infoText}>
                <strong>Position:</strong> {jobTitle}
              </Text>
              <Text style={infoText}>
                <strong>Company:</strong> {company}
              </Text>
              <Text style={infoText}>
                <strong>Status:</strong> {status.charAt(0).toUpperCase() + status.slice(1)}
              </Text>
            </Section>
            
            <Section style={buttonContainer}>
              <Link href={dashboardUrl} style={button}>
                View Dashboard
              </Link>
            </Section>
            
            {status === 'rejected' && (
              <Text style={text}>
                Don't be discouraged! Keep applying to other positions that match your skills and experience.
              </Text>
            )}
          </Section>
          
          <Section style={footer}>
            <Text style={footerText}>
              © 2025 FieldJobs. All rights reserved.
            </Text>
            <Text style={footerText}>
              <Link href="https://field-jobs.co" style={link}>Visit FieldJobs</Link>
              {' • '}
              <Link href="https://field-jobs.co/contact" style={link}>Contact Us</Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

export default ApplicationStatusUpdateEmail

const main = {
  backgroundColor: '#f5f5f5',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
}

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0',
  marginBottom: '64px',
  maxWidth: '600px',
}

const header = {
  backgroundColor: '#ff6b35',
  padding: '20px',
  textAlign: 'center' as const,
}

const h1 = {
  color: '#ffffff',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '0',
  padding: '0',
}

const content = {
  padding: '40px 40px',
}

const emojiStyle = {
  fontSize: '48px',
  textAlign: 'center' as const,
  margin: '0 0 20px 0',
}

const h2 = {
  color: '#333333',
  fontSize: '20px',
  fontWeight: 'bold',
  marginBottom: '20px',
  textAlign: 'center' as const,
}

const text = {
  color: '#333333',
  fontSize: '16px',
  lineHeight: '24px',
  marginBottom: '16px',
}

const infoBox = {
  backgroundColor: '#f9f9f9',
  border: '1px solid #eeeeee',
  borderRadius: '5px',
  padding: '20px',
  margin: '24px 0',
}

const infoText = {
  color: '#333333',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '8px 0',
}

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '32px 0',
}

const button = {
  backgroundColor: '#ff6b35',
  borderRadius: '5px',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '12px 32px',
}

const footer = {
  backgroundColor: '#f9f9f9',
  padding: '20px 40px',
  textAlign: 'center' as const,
  borderTop: '1px solid #eeeeee',
}

const footerText = {
  color: '#666666',
  fontSize: '12px',
  lineHeight: '20px',
  margin: '4px 0',
}

const link = {
  color: '#ff6b35',
  textDecoration: 'underline',
}

