// Phase 1E — mobile-responsive Prae interface tests (synthetic data only).
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import PraeActivityPage from '../pages/PraeActivityPage';
import PraeApprovalDetail from '../components/prae/PraeApprovalDetail';
import { PRAE_ACTIVITY_DEMO } from '../components/prae/praeActivityDemo';

function setMobileViewport() {
  Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 390 });
  Object.defineProperty(window, 'innerHeight', { writable: true, configurable: true, value: 844 });
  window.dispatchEvent(new Event('resize'));
}

beforeEach(() => setMobileViewport());

describe('Prae activity area (mobile)', () => {
  it('renders all four sections', () => {
    render(
      <MemoryRouter>
        <PraeActivityPage />
      </MemoryRouter>,
    );
    expect(screen.getByRole('tab', { name: 'Activity' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Needs Approval' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Completed' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Failed \/ Needs Attention/ })).toBeInTheDocument();
  });

  it('shows detection, preparation, status, time, division, rep and approval info', () => {
    render(
      <MemoryRouter>
        <PraeActivityPage />
      </MemoryRouter>,
    );
    expect(screen.getAllByText(/Detected:/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Prepared:/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Outcome:/).length).toBeGreaterThan(0);
    expect(screen.getAllByText('Snow & Ice').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Dispatch \(sample\)/).length).toBeGreaterThan(0);
    expect(screen.getAllByText('Approval required').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/approved by Owner \(sample\)/).length).toBeGreaterThan(0);
  });

  it('opens the approval detail without navigating away', () => {
    render(
      <MemoryRouter initialEntries={['/prae']}>
        <PraeActivityPage />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getAllByRole('button', { name: /Detected:/ })[0]);
    expect(screen.getByText('Approval detail')).toBeInTheDocument();
  });
});

describe('Prae approval detail', () => {
  const emailItem = PRAE_ACTIVITY_DEMO.find((i) => i.proposal?.channel === 'email')!;
  const smsItem = PRAE_ACTIVITY_DEMO.find((i) => i.proposal?.channel === 'sms')!;

  it('shows the exact proposed email with all required fields', () => {
    render(<PraeApprovalDetail item={emailItem} />);
    for (const label of ['From', 'To', 'Cc', 'Subject', 'Body', 'Attachments']) {
      expect(screen.getAllByText(label).length).toBeGreaterThan(0);
    }
    const p = emailItem.proposal as { body: string; subject: string };
    expect(screen.getByText(p.subject)).toBeInTheDocument();
    expect(screen.getByText((t) => t.includes('confirm the gate code'))).toBeInTheDocument();
    expect(screen.getByText(/Customer/)).toBeInTheDocument();
    expect(screen.getByText(/Risk & sensitivity/)).toBeInTheDocument();
  });

  it('shows SMS numbers, body, segments and opt-out warning', () => {
    render(<PraeApprovalDetail item={smsItem} />);
    expect(screen.getByText('+15550100')).toBeInTheDocument();
    expect(screen.getByText('+15550142')).toBeInTheDocument();
    expect(screen.getByText(/segment\(s\)/)).toBeInTheDocument();
    expect(screen.getByText(/Opt-out language present/)).toBeInTheDocument();
  });

  it('keeps Edit, Reject and Approve visible but disabled and labelled', () => {
    render(<PraeApprovalDetail item={emailItem} />);
    for (const name of [/^Edit/, /^Reject/, /^Approve/]) {
      const btn = screen.getByRole('button', { name });
      expect(btn).toBeDisabled();
      expect(btn.textContent).toContain('Not enabled yet');
    }
  });

  it('states that an SMS reply can never approve an action', () => {
    const { container } = render(<PraeApprovalDetail item={emailItem} />);
    expect(within(container).getByText(/SMS reply can\s+never approve anything/)).toBeInTheDocument();
  });
});
