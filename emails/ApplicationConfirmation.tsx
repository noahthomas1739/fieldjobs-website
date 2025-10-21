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

interface ApplicationConfirmationEmailProps {
  applicantName: string
  jobTitle: string
  company: string
  appliedDate: string
  jobUrl?: string
}

export const ApplicationConfirmationEmail = ({
  applicantName,
  jobTitle,
  company,
  appliedDate,
  jobUrl = 'https://field-jobs.co',
}: ApplicationConfirmationEmailProps) => (
  <Html>
    <Head />
    <Preview>Your application to {company} has been submitted</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Heading style={h1}>⚙️ FieldJobs</Heading>
        </Section>
        
        <Section style={content}>
          <Heading style={h2}>Application Submitted Successfully!</Heading>
          
          <Text style={text}>
            Hi {applicantName},
          </Text>
          
          <Text style={text}>
            Your application for <strong>{jobTitle}</strong> at <strong>{company}</strong> has been successfully submitted on {appliedDate}.
          </Text>
          
          <Text style={text}>
            The employer will review your application and contact you if they're interested in moving forward.
          </Text>
          
          <Section style={buttonContainer}>
            <Link href={jobUrl} style={button}>
              View Job Posting
            </Link>
          </Section>
          
          <Text style={text}>
            You can track the status of your application in your dashboard at any time.
          </Text>
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

export default ApplicationConfirmationEmail

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

const h2 = {
  color: '#333333',
  fontSize: '20px',
  fontWeight: 'bold',
  marginBottom: '20px',
}

const text = {
  color: '#333333',
  fontSize: '16px',
  lineHeight: '24px',
  marginBottom: '16px',
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

