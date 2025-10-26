import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components'
import * as React from 'react'

interface NewApplicationAlertEmailProps {
  employerName: string
  applicantName: string
  jobTitle: string
  appliedDate: string
  dashboardUrl?: string
}

export const NewApplicationAlertEmail = ({
  employerName,
  applicantName,
  jobTitle,
  appliedDate,
  dashboardUrl = 'https://field-jobs.co/employer',
}: NewApplicationAlertEmailProps) => (
  <Html>
    <Head />
    <Preview>New application from {applicantName} for {jobTitle}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Img
            src="https://field-jobs.co/fieldjobs-logo.svg"
            alt="FieldJobs"
            width="120"
            height="40"
            style={logo}
          />
        </Section>
        
        <Section style={content}>
          <Heading style={h2}>🎉 New Application Received!</Heading>
          
          <Text style={text}>
            Hi {employerName},
          </Text>
          
          <Text style={text}>
            You have a new application for <strong>{jobTitle}</strong>.
          </Text>
          
          <Section style={infoBox}>
            <Text style={infoText}>
              <strong>Applicant:</strong> {applicantName}
            </Text>
            <Text style={infoText}>
              <strong>Applied:</strong> {appliedDate}
            </Text>
            <Text style={infoText}>
              <strong>Position:</strong> {jobTitle}
            </Text>
          </Section>
          
          <Section style={buttonContainer}>
            <Link href={dashboardUrl} style={button}>
              View Application
            </Link>
          </Section>
          
          <Text style={text}>
            Review the application and resume in your employer dashboard.
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

export default NewApplicationAlertEmail

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

const logo = {
  display: 'block',
  margin: '0 auto',
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

