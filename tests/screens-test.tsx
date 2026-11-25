import { act, fireEvent, render, screen } from '@testing-library/react-native';
import type { ReactElement } from 'react';

import { CapturePanel } from '@/components/capture-panel';
import { SignInForm } from '@/components/sign-in-form';
import { VaultHome } from '@/components/vault-home';
import { ThemeProvider } from '@/theme/ThemeProvider';
import type { Membership, VaultSnapshot } from '@/domain/types';

function renderWithTheme(node: ReactElement) {
  return render(<ThemeProvider>{node}</ThemeProvider>);
}

const organization: Membership = {
  id: 'mem',
  organizationId: 'org_harborline',
  userId: 'user_maya',
  role: 'compliance_manager',
  displayName: 'Maya Chen',
  email: 'maya@harborline.demo',
  organization: {
    id: 'org_harborline',
    name: 'Harborline Construction',
    slug: 'harborline',
    plan: 'pro',
    stripeCustomerId: 'cus_test_harborline',
    createdAt: '2024-03-12T15:00:00.000Z',
  },
};

const snapshot: VaultSnapshot = {
  organizationId: 'org_harborline',
  summary: { compliant: 7, expiring: 4, expired: 1, missing: 3 },
  rows: [
    {
      requirementId: 'req_harrow_gl',
      name: 'General liability COI',
      documentType: 'general_liability',
      subjectType: 'vendor',
      subjectId: 'vendor_harrow',
      subjectName: 'Harrow Hauling',
      status: 'missing',
      expiresOn: null,
      daysRemaining: null,
      review: 'none',
      documentNumber: null,
    },
  ],
  people: [],
  vendors: [],
  alerts: [],
  fromCache: false,
  fetchedAt: '2026-11-25T15:00:00.000Z',
};

describe('sign in', () => {
  test('the demo entry is available', async () => {
    const onDemo = jest.fn();
    await renderWithTheme(
      <SignInForm
        email=""
        password=""
        error={null}
        busy={false}
        onChangeEmail={jest.fn()}
        onChangePassword={jest.fn()}
        onSubmit={jest.fn()}
        onMagic={jest.fn()}
        onDemo={onDemo}
      />,
    );
    fireEvent.press(screen.getByLabelText('Try the demo'));
    expect(onDemo).toHaveBeenCalled();
    expect(screen.getByText('Harborline keeps every certificate, license, and insurance document with the person or vendor who owes it.')).toBeTruthy();
  });
});

describe('vault home', () => {
  test('shows the four compliance counts and an empty filter result', async () => {
    await renderWithTheme(
      <VaultHome
        organization={organization}
        snapshot={snapshot}
        loading={false}
        error={null}
        refreshing={false}
        query=""
        filter="expired"
        onQuery={jest.fn()}
        onFilter={jest.fn()}
        onRefresh={jest.fn()}
        onOpenRequirement={jest.fn()}
        onOpenOrg={jest.fn()}
      />,
    );
    expect(screen.getByTestId('stat-value-missing').props.children).toBe(3);
    expect(screen.getByText('Harborline Construction')).toBeTruthy();
    expect(screen.getByText('Nothing in this lane')).toBeTruthy();
  });
});

describe('capture confirmation', () => {
  test('sample extraction can be corrected and then filed', async () => {
    const onSubmit = jest.fn();
    await renderWithTheme(
      <CapturePanel
        requirementName="General liability COI"
        holderHint="Harrow Hauling"
        busy={false}
        error={null}
        readDelayMs={0}
        onPickCamera={async () => null}
        onPickLibrary={async () => null}
        onPickFile={async () => null}
        onUseSample={() => ({ fileName: 'general-liability-sample.pdf', mimeType: 'application/pdf', uri: 'sample://certificate.pdf' })}
        onSubmit={onSubmit}
      />,
    );
    await act(async () => {
      fireEvent.press(screen.getByLabelText('Use a sample certificate'));
    });
    expect(await screen.findByTestId('field-number')).toBeTruthy();
    await act(async () => {
      fireEvent.changeText(screen.getByTestId('field-number'), '');
    });
    await act(async () => {
      fireEvent.press(screen.getByLabelText('File document'));
    });
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText('Enter the document number.')).toBeTruthy();
    await act(async () => {
      fireEvent.changeText(screen.getByTestId('field-number'), 'GL-100');
    });
    await act(async () => {
      fireEvent.press(screen.getByLabelText('File document'));
    });
    expect(onSubmit).toHaveBeenCalled();
    expect(onSubmit.mock.calls[0]?.[1].documentNumber).toBe('GL-100');
    expect(onSubmit.mock.calls[0]?.[1].holderName).toBe('Harrow Hauling');
  });
});
