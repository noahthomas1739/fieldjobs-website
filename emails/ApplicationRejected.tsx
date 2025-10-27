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

interface ApplicationRejectedEmailProps {
  applicantName: string
  jobTitle: string
  company: string
  appliedDate: string
  rejectionReason?: string
}

export const ApplicationRejectedEmail = ({
  applicantName,
  jobTitle,
  company,
  appliedDate,
  rejectionReason,
}: ApplicationRejectedEmailProps) => (
  <Html>
    <Head />
    <Preview>Update on your application to {company}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Img
            src="https://field-jobs.co/favicon.svg"
            alt="FieldJobs"
            width="40"
            height="40"
            style={logo}
          />
        </Section>
        
        <Section style={content}>
          <Heading style={h1}>Application Update</Heading>
          
          <Text style={text}>
            Hi {applicantName},
          </Text>
          
          <Text style={text}>
            Thank you for your interest in the <strong>{jobTitle}</strong> position at <strong>{company}</strong>. 
            After careful consideration, they have decided to move forward with other candidates for this role.
          </Text>
          
          {rejectionReason && (
            <Section style={reasonBox}>
              <Text style={reasonText}>
                <strong>Feedback:</strong> {rejectionReason}
              </Text>
            </Section>
          )}
          
          <Text style={text}>
            We encourage you to continue exploring other opportunities on FieldJobs. 
            Your skills and experience may be a great fit for other positions.
          </Text>
          
          <Section style={buttonContainer}>
            <Link href="https://field-jobs.co" style={button}>
              Browse More Jobs
            </Link>
          </Section>
          
          <Text style={text}>
            Thank you for using FieldJobs.
          </Text>
          
          <Text style={text}>
            Best regards,<br />
            The FieldJobs Team
          </Text>
        </Section>
        
        <Section style={footer}>
          <Text style={footerText}>
            This email was sent by FieldJobs on behalf of {company}.
          </Text>
          <Text style={footerText}>
            <Link href="https://field-jobs.co" style={footerLink}>FieldJobs</Link> • 
            <Link href="https://field-jobs.co/contact" style={footerLink}>Contact Us</Link>
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

const main = {
  backgroundColor: '#f6f9fc',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
}

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
}

const header = {
  padding: '32px 24px 0',
  textAlign: 'center' as const,
}

const logo = {
  margin: '0 auto',
}

const content = {
  padding: '0 24px',
}

const h1 = {
  color: '#333',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '40px 0',
  padding: '0',
  textAlign: 'center' as const,
}

const text = {
  color: '#333',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '16px 0',
}

const reasonBox = {
  backgroundColor: '#f8f9fa',
  border: '1px solid #e9ecef',
  borderRadius: '8px',
  padding: '16px',
  margin: '16px 0',
}

const reasonText = {
  color: '#333',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '0',
}

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '32px 0',
}

const button = {
  backgroundColor: '#ff6b35',
  borderRadius: '8px',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '12px 24px',
}

const footer = {
  color: '#8898aa',
  fontSize: '12px',
  lineHeight: '16px',
  textAlign: 'center' as const,
  marginTop: '48px',
  padding: '0 24px',
}

const footerText = {
  color: '#8898aa',
  fontSize: '12px',
  lineHeight: '16px',
  margin: '8px 0',
}

const footerLink = {
  color: '#8898aa',
  textDecoration: 'underline',
}
