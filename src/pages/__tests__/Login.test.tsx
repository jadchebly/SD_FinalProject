/**
 * Login Component Test
 * use screenLogTestingPlayground to verify
 */


import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import Login from '../Login';
import { AuthProvider } from '../../contexts/AuthContext';
import * as api from '../../services/api';

// Mock the API
vi.mock('../../services/api', () => ({
  default: {
    login: vi.fn(),
    setAuthHeaderProvider: vi.fn(),
    setCurrentUserProvider: vi.fn(),
    getMe: vi.fn(),
    getFollowing: vi.fn(),
  },
}));

// Mock navigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const renderLogin = () => {
  // Mock API calls that happen in AuthProvider useEffect
  vi.mocked(api.default.getMe).mockResolvedValue({
    success: false,
  });
  
  return render(
    <BrowserRouter>
      <AuthProvider>
        <Login />
      </AuthProvider>
    </BrowserRouter>
  );
};

describe('Login Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockClear();
    vi.mocked(api.default.getMe).mockResolvedValue({
      success: false,
    });
  });

  // Rendering Test
  it('renders login form', () => {
    renderLogin();

    expect(screen.getByRole('heading', { name: /login/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/enter your email/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/enter your password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();
    expect(screen.getByText(/don't have an account/i)).toBeInTheDocument();
  });

  // UI Input Test
  it('displays email and password input ', () => {
    renderLogin();

    const emailInput = screen.getByPlaceholderText(/enter your email/i);
    const passwordInput = screen.getByPlaceholderText(/enter your password/i);

    expect(emailInput).toBeInTheDocument();
    expect(passwordInput).toBeInTheDocument();
    expect(emailInput).toHaveAttribute('type', 'email');
    expect(passwordInput).toHaveAttribute('type', 'password');
  });

  // User Interaction Test
  it('allows user to type in email and password', async () => {
    const user = userEvent.setup();
    renderLogin();

    const emailInput = screen.getByPlaceholderText(/enter your email/i);
    const passwordInput = screen.getByPlaceholderText(/enter your password/i);

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');

    expect(emailInput).toHaveValue('test@example.com');
    expect(passwordInput).toHaveValue('password123');
  });

  // Error Handling Test
  it('shows error message when login fails', async () => {
    const user = userEvent.setup();
    vi.mocked(api.default.login).mockResolvedValue({
      success: false,
    });
    vi.mocked(api.default.getMe).mockResolvedValue({
      success: false,
    });

    renderLogin();

    const emailInput = screen.getByPlaceholderText(/enter your email/i);
    const passwordInput = screen.getByPlaceholderText(/enter your password/i);
    const submitButton = screen.getByRole('button', { name: /login/i });

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'wrongpassword');
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Invalid email or password')).toBeInTheDocument();
    });
  });

  // Integration Test
  it('navigates to dashboard on successful login', async () => {
    const user = userEvent.setup();
    const mockUser = {
      id: '1',
      username: 'testuser',
      email: 'test@example.com',
    };

    vi.mocked(api.default.login).mockResolvedValue({
      success: true,
      user: mockUser,
    });
    vi.mocked(api.default.getFollowing).mockResolvedValue({
      success: true,
      following: [],
    });
    vi.mocked(api.default.getMe).mockResolvedValue({
      success: false,
    });

    renderLogin();

    const emailInput = screen.getByPlaceholderText(/enter your email/i);
    const passwordInput = screen.getByPlaceholderText(/enter your password/i);
    const submitButton = screen.getByRole('button', { name: /login/i });

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    }, { timeout: 3000 });
  });

  // Form Validation Test
  it('requires email and password fields', () => {
    renderLogin();

    const emailInput = screen.getByPlaceholderText(/enter your email/i);
    const passwordInput = screen.getByPlaceholderText(/enter your password/i);

    expect(emailInput).toBeRequired();
    expect(passwordInput).toBeRequired();
  });

  // Navigation/Link Test
  it('has a link to sign up page', () => {
    renderLogin();

    const signUpLink = screen.getByRole('link', { name: /sign up/i });
    expect(signUpLink).toBeInTheDocument();
    expect(signUpLink).toHaveAttribute('href', '/signup');
  });
});

