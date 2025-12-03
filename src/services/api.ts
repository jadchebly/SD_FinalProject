const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

type HeaderProvider = () => Promise<Record<string,string>> | Record<string,string>;
type UserProvider = () => any;

class ApiService {
  private authHeaderProvider: HeaderProvider | null = null;
  private currentUserProvider: UserProvider | null = null;

  setAuthHeaderProvider(provider: HeaderProvider) {
    this.authHeaderProvider = provider;
  }

  setCurrentUserProvider(provider: UserProvider) {
    this.currentUserProvider = provider;
  }

  private async getAuthHeaders(): Promise<Record<string,string>> {
    try {
      if (!this.authHeaderProvider) return {};
      const result = this.authHeaderProvider();
      if (result instanceof Promise) return await result;
      return result;
    } catch (e) {
      console.warn('Auth header provider failed', e);
      return {};
    }
  }

  private getCurrentUser(): any {
    try {
      if (!this.currentUserProvider) return null;
      return this.currentUserProvider();
    } catch (e) {
      console.warn('Current user provider failed', e);
      return null;
    }
  }

  // Convenience method to rehydrate current user from server
  async getMe(): Promise<any> {
    const response = await fetch(`${API_URL}/api/me`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...await this.getAuthHeaders(),
      },
    });

    if (!response.ok) throw new Error('Failed to get current user');
    return response.json();
  }

  async getFollowing(id: string): Promise<any> {
    const response = await fetch(`${API_URL}/api/following`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...await this.getAuthHeaders(),
      },
    });

    if (!response.ok) throw new Error('Failed to get following list');
    return response.json();
  }

  // ... rest of methods follow, using getAuthHeaders() and getCurrentUser()

  
  async uploadImage(file: File): Promise<{ url: string; path: string }> {
    const formData = new FormData();
    formData.append('image', file);

    console.log('Uploading to:', `${API_URL}/api/upload`);

    const response = await fetch(`${API_URL}/api/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      let errorMessage = 'Upload failed';
      try {
        const error = await response.json();
        errorMessage = error.error || error.message || errorMessage;
      } catch (e) {
        errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      }
      console.error('Upload failed:', errorMessage);
      throw new Error(errorMessage);
    }

    const result = await response.json();
    // Backend returns { success: true, url, path }
    if (result.success && result.url) {
      return { url: result.url, path: result.path };
    }
    // Fallback for direct { url, path } response
    return { url: result.url, path: result.path };
  }

  async createPost(post: {
    title: string;
    content: string;
    type: string;
    image_url?: string | null;
    video_url?: string | null;
    user_id?: string;
    username?: string;
  }): Promise<any> {
    const user = this.getCurrentUser() || {};
    const headers = await this.getAuthHeaders();

    const response = await fetch(`${API_URL}/api/posts`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify({
        ...post,
        // preserve previous behavior: include current user id/username if available
        user_id: post.user_id || user?.id,
        username: post.username || user?.username,
      }),
    });

    if (!response.ok) {
      let errorMessage = 'Failed to create post';
      let errorDetails = '';
      try {
        const error = await response.json();
        errorMessage = error.error || error.message || errorMessage;
        errorDetails = error.details || '';
        console.error('API Error:', error);
      } catch (e) {
        errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      }
      const fullError = errorDetails ? `${errorMessage} - ${errorDetails}` : errorMessage;
      throw new Error(fullError);
    }

    return response.json();
  }

  async updatePost(postId: string, title: string, content: string): Promise<any> {
    const headers = await this.getAuthHeaders();

    const response = await fetch(`${API_URL}/api/posts/${postId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify({ title, content }),
    });

    if (!response.ok) {
      let errorMessage = 'Failed to update post';
      try {
        const error = await response.json();
        errorMessage = error.error || error.message || errorMessage;
      } catch (e) {
        errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      }
      throw new Error(errorMessage);
    }

    return response.json();
  }

  async deletePost(postId: string): Promise<any> {
    const user = this.getCurrentUser() || {};
    const headers = await this.getAuthHeaders();
    
    console.log('📡 API: Deleting post', postId);
    console.log('📡 API: User ID:', user?.id);
    console.log('📡 API: Request URL:', `${API_URL}/api/posts/${postId}`);
    
    const response = await fetch(`${API_URL}/api/posts/${postId}`, {
      method: 'DELETE',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    });

    console.log('📡 API: Response status:', response.status);
    console.log('📡 API: Response ok:', response.ok);

    // 404 means post doesn't exist in database
    if (response.status === 404) {
      console.warn('⚠️ API: Post not found (404)');
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Post not found');
    }

    if (!response.ok) {
      let errorMessage = 'Failed to delete post';
      let errorDetails = '';
      try {
        const error = await response.json();
        errorMessage = error.error || error.message || errorMessage;
        errorDetails = error.details || '';
        console.error('❌ API Error:', error);
      } catch (e) {
        errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        console.error('❌ API: Failed to parse error response');
      }
      throw new Error(errorDetails ? `${errorMessage} - ${errorDetails}` : errorMessage);
    }

    const result = await response.json();
    console.log('✅ API: Delete successful:', result);
    return result;
  }

  async login(email: string, password: string): Promise<any> {
    const response = await fetch(`${API_URL}/api/login`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      let errorMessage = 'Failed to login';
      try {
        const error = await response.json();
        errorMessage = error.error || error.message || errorMessage;
      } catch (e) {
        errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      }
      throw new Error(errorMessage);
    }

    return response.json();
  }

  async signup(username: string, email: string, password: string): Promise<any> {
    const response = await fetch(`${API_URL}/api/signup`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, email, password }),
    });

    if (!response.ok) {
      let errorMessage = 'Failed to create account';
      try {
        const error = await response.json();
        errorMessage = error.error || error.message || errorMessage;
      } catch (e) {
        errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      }
      throw new Error(errorMessage);
    }

    return response.json();
  }

  async logout(): Promise<any> {
    const response = await fetch(`${API_URL}/api/logout`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...await this.getAuthHeaders(),
      },
    });

    if (!response.ok) {
      throw new Error('Failed to logout');
    }

    return response.json();
  }

  async getFeed(): Promise<any> {
    const headers = await this.getAuthHeaders();

    const response = await fetch(`${API_URL}/api/feed`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to get feed');
    }

    return response.json();
  }

  async getUserProfile(userId: string): Promise<any> {
    const headers = await this.getAuthHeaders();

    const response = await fetch(`${API_URL}/api/users/${userId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to get user profile');
    }

    return response.json();
  }

  async getSuggestedUsers(): Promise<any> {
    const headers = await this.getAuthHeaders();
    const response = await fetch(`${API_URL}/api/users/suggested`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to get suggested users');
    }

    return response.json();
  }

  async followUser(userId: string): Promise<any> {
    const headers = await this.getAuthHeaders();
    
    const response = await fetch(`${API_URL}/api/follow/${userId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    });

    if (!response.ok) {
      let errorMessage = 'Failed to follow user';
      try {
        const error = await response.json();
        errorMessage = error.error || error.message || errorMessage;
      } catch (e) {
        errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      }
      throw new Error(errorMessage);
    }

    return response.json();
  }

  async unfollowUser(userId: string): Promise<any> {
    const headers = await this.getAuthHeaders();
    
    const response = await fetch(`${API_URL}/api/follow/${userId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    });

    if (!response.ok) {
      let errorMessage = 'Failed to unfollow user';
      try {
        const error = await response.json();
        errorMessage = error.error || error.message || errorMessage;
      } catch (e) {
        errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      }
      throw new Error(errorMessage);
    }

    return response.json();
  }

  async updateUserAvatar(userId: string, avatarUrl: string): Promise<any> {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    
    const response = await fetch(`${API_URL}/api/users/${userId}/avatar`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(user.id && { 'x-user-id': user.id }),
      },
      body: JSON.stringify({ avatar_url: avatarUrl }),
    });

    if (!response.ok) {
      throw new Error('Failed to update avatar');
    }

    return response.json();
  }

  async getFollowers(userId: string): Promise<any> {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    
    const response = await fetch(`${API_URL}/api/users/${userId}/followers`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(user.id && { 'x-user-id': user.id }),
      },
    });

    if (!response.ok) {
      throw new Error('Failed to get followers');
    }

    return response.json();
  }

  async getUserFollowing(userId: string): Promise<any> {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    
    const response = await fetch(`${API_URL}/api/users/${userId}/following`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(user.id && { 'x-user-id': user.id }),
      },
    });

    if (!response.ok) {
      throw new Error('Failed to get following');
    }

    return response.json();
  }

  async likePost(postId: string): Promise<any> {
    const headers = await this.getAuthHeaders();
    
    const response = await fetch(`${API_URL}/api/posts/${postId}/like`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to like post');
    }

    return response.json();
  }

  async unlikePost(postId: string): Promise<any> {
    const headers = await this.getAuthHeaders();
    
    const response = await fetch(`${API_URL}/api/posts/${postId}/like`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to unlike post');
    }

    return response.json();
  }

  async getComments(postId: string): Promise<any> {
    const response = await fetch(`${API_URL}/api/posts/${postId}/comments`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to get comments');
    }

    return response.json();
  }

  async addComment(postId: string, text: string): Promise<any> {
    const headers = await this.getAuthHeaders();
    
    const response = await fetch(`${API_URL}/api/posts/${postId}/comments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify({ text }),
    });

    if (!response.ok) {
      throw new Error('Failed to add comment');
    }

    return response.json();
  }

  async searchUsers(query: string): Promise<any> {
    const headers = await this.getAuthHeaders();
    
    const response = await fetch(`${API_URL}/api/users/search/${encodeURIComponent(query)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to search users');
    }

    return response.json();
  }

  async getUserPosts(userId: string): Promise<any> {
    const headers = await this.getAuthHeaders();
    
    const response = await fetch(`${API_URL}/api/posts?user_id=${userId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to get user posts');
    }

    return response.json();
  }
}

export default new ApiService();

