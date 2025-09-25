/**
 * NCLEX-RN Prep - Professional User Management System
 * Real user database with full CRUD operations
 */

class UserManagementSystem {
    constructor() {
        this.dbName = 'NCLEXPrepDB';
        this.dbVersion = 1;
        this.db = null;
        this.currentUser = null;
        
        // Initialize system
        this.init();
    }

    async init() {
        try {
            await this.initDatabase();
            await this.loadCurrentSession();
            console.log('🚀 User Management System initialized successfully');
        } catch (error) {
            console.error('Failed to initialize user system:', error);
        }
    }

    // Initialize IndexedDB for real user storage
    async initDatabase() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);
            
            request.onerror = () => reject(request.error);
            
            request.onsuccess = (event) => {
                this.db = event.target.result;
                resolve();
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // Create users table
                if (!db.objectStoreNames.contains('users')) {
                    const userStore = db.createObjectStore('users', { keyPath: 'id', autoIncrement: true });
                    userStore.createIndex('email', 'email', { unique: true });
                    userStore.createIndex('username', 'username', { unique: true });
                }
                
                // Create user progress table
                if (!db.objectStoreNames.contains('userProgress')) {
                    const progressStore = db.createObjectStore('userProgress', { keyPath: 'userId' });
                    progressStore.createIndex('userId', 'userId', { unique: true });
                }
                
                // Create user sessions table
                if (!db.objectStoreNames.contains('sessions')) {
                    const sessionStore = db.createObjectStore('sessions', { keyPath: 'sessionId' });
                    sessionStore.createIndex('userId', 'userId', { unique: false });
                }
            };
        });
    }

    // Register new user with comprehensive validation
    async registerUser(userData) {
        try {
            // Validate user data
            const validation = this.validateUserData(userData);
            if (!validation.valid) {
                throw new Error(validation.message);
            }
            
            // Check if user already exists
            const existingUser = await this.getUserByEmail(userData.email);
            if (existingUser) {
                throw new Error('An account with this email already exists');
            }
            
            // Create secure user object
            const user = {
                email: userData.email.toLowerCase().trim(),
                username: userData.username.trim(),
                firstName: userData.firstName.trim(),
                lastName: userData.lastName.trim(),
                passwordHash: await this.hashPassword(userData.password),
                createdAt: new Date().toISOString(),
                lastLoginAt: null,
                isActive: true,
                role: 'student',
                preferences: {
                    rememberMe: userData.rememberMe || false,
                    emailNotifications: true,
                    studyReminders: true
                },
                profile: {
                    graduationDate: userData.graduationDate || null,
                    schoolName: userData.schoolName || '',
                    examDate: userData.examDate || null,
                    studyGoal: userData.studyGoal || 20
                }
            };
            
            // Store user in database
            const userId = await this.storeUser(user);
            
            // Initialize user progress
            await this.initializeUserProgress(userId);
            
            // Create session
            const sessionData = await this.createSession(userId, userData.rememberMe);
            
            console.log('✅ User registered successfully:', user.email);
            return {
                success: true,
                user: this.sanitizeUser(user),
                session: sessionData
            };
            
        } catch (error) {
            console.error('Registration failed:', error);
            return {
                success: false,
                message: error.message
            };
        }
    }

    // Authenticate user login
    async authenticateUser(email, password, rememberMe = false) {
        try {
            // Get user by email
            const user = await this.getUserByEmail(email.toLowerCase().trim());
            if (!user) {
                throw new Error('Invalid email or password');
            }
            
            // Verify password
            const passwordValid = await this.verifyPassword(password, user.passwordHash);
            if (!passwordValid) {
                throw new Error('Invalid email or password');
            }
            
            // Check if user is active
            if (!user.isActive) {
                throw new Error('Account has been deactivated. Please contact support.');
            }
            
            // Update last login
            await this.updateLastLogin(user.id);
            
            // Create session
            const sessionData = await this.createSession(user.id, rememberMe);
            
            // Set current user
            this.currentUser = user;
            
            console.log('✅ User authenticated successfully:', user.email);
            return {
                success: true,
                user: this.sanitizeUser(user),
                session: sessionData
            };
            
        } catch (error) {
            console.error('Authentication failed:', error);
            return {
                success: false,
                message: error.message
            };
        }
    }

    // Get current user session
    async getCurrentUser() {
        const sessionId = localStorage.getItem('nclex_session_id') || sessionStorage.getItem('nclex_session_id');
        if (!sessionId) return null;
        
        const session = await this.getSession(sessionId);
        if (!session || this.isSessionExpired(session)) {
            await this.logout();
            return null;
        }
        
        const user = await this.getUserById(session.userId);
        return user ? this.sanitizeUser(user) : null;
    }

    // Logout user
    async logout() {
        const sessionId = localStorage.getItem('nclex_session_id') || sessionStorage.getItem('nclex_session_id');
        
        if (sessionId) {
            await this.deleteSession(sessionId);
        }
        
        localStorage.removeItem('nclex_session_id');
        sessionStorage.removeItem('nclex_session_id');
        localStorage.removeItem('nclex_user_data');
        
        this.currentUser = null;
        console.log('✅ User logged out successfully');
        
        return { success: true };
    }

    // Update user profile
    async updateUserProfile(userId, updates) {
        try {
            const user = await this.getUserById(userId);
            if (!user) {
                throw new Error('User not found');
            }
            
            // Merge updates
            const updatedUser = {
                ...user,
                ...updates,
                updatedAt: new Date().toISOString()
            };
            
            await this.updateUser(updatedUser);
            
            return {
                success: true,
                user: this.sanitizeUser(updatedUser)
            };
            
        } catch (error) {
            console.error('Profile update failed:', error);
            return {
                success: false,
                message: error.message
            };
        }
    }

    // Get user progress data
    async getUserProgress(userId) {
        try {
            const transaction = this.db.transaction(['userProgress'], 'readonly');
            const store = transaction.objectStore('userProgress');
            const request = store.get(userId);
            
            return new Promise((resolve, reject) => {
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });
        } catch (error) {
            console.error('Failed to get user progress:', error);
            return null;
        }
    }

    // Update user progress
    async updateUserProgress(userId, progressData) {
        try {
            const existing = await this.getUserProgress(userId) || { userId };
            const updated = {
                ...existing,
                ...progressData,
                lastUpdated: new Date().toISOString()
            };
            
            const transaction = this.db.transaction(['userProgress'], 'readwrite');
            const store = transaction.objectStore('userProgress');
            await store.put(updated);
            
            return { success: true, progress: updated };
        } catch (error) {
            console.error('Failed to update user progress:', error);
            return { success: false, message: error.message };
        }
    }

    // Private helper methods
    validateUserData(data) {
        if (!data.email || !this.isValidEmail(data.email)) {
            return { valid: false, message: 'Please enter a valid email address' };
        }
        
        if (!data.username || data.username.length < 3) {
            return { valid: false, message: 'Username must be at least 3 characters long' };
        }
        
        if (!data.firstName || data.firstName.length < 2) {
            return { valid: false, message: 'First name must be at least 2 characters long' };
        }
        
        if (!data.lastName || data.lastName.length < 2) {
            return { valid: false, message: 'Last name must be at least 2 characters long' };
        }
        
        if (!data.password || data.password.length < 8) {
            return { valid: false, message: 'Password must be at least 8 characters long' };
        }
        
        if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(data.password)) {
            return { valid: false, message: 'Password must contain at least one uppercase letter, one lowercase letter, and one number' };
        }
        
        return { valid: true };
    }

    isValidEmail(email) {
        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        return emailRegex.test(email);
    }

    async hashPassword(password) {
        const encoder = new TextEncoder();
        const data = encoder.encode(password + 'NCLEX_SALT_2024');
        const hash = await crypto.subtle.digest('SHA-256', data);
        return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
    }

    async verifyPassword(password, hash) {
        const computedHash = await this.hashPassword(password);
        return computedHash === hash;
    }

    async storeUser(user) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['users'], 'readwrite');
            const store = transaction.objectStore('users');
            const request = store.add(user);
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getUserByEmail(email) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['users'], 'readonly');
            const store = transaction.objectStore('users');
            const index = store.index('email');
            const request = index.get(email);
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getUserById(id) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['users'], 'readonly');
            const store = transaction.objectStore('users');
            const request = store.get(id);
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async updateUser(user) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['users'], 'readwrite');
            const store = transaction.objectStore('users');
            const request = store.put(user);
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async updateLastLogin(userId) {
        const user = await this.getUserById(userId);
        if (user) {
            user.lastLoginAt = new Date().toISOString();
            await this.updateUser(user);
        }
    }

    async createSession(userId, rememberMe = false) {
        const sessionId = this.generateSessionId();
        const expiresAt = new Date();
        expiresAt.setTime(expiresAt.getTime() + (rememberMe ? 30 * 24 * 60 * 60 * 1000 : 12 * 60 * 60 * 1000));
        
        const session = {
            sessionId,
            userId,
            createdAt: new Date().toISOString(),
            expiresAt: expiresAt.toISOString(),
            rememberMe,
            isActive: true
        };
        
        // Store session in IndexedDB
        const transaction = this.db.transaction(['sessions'], 'readwrite');
        const store = transaction.objectStore('sessions');
        await store.put(session);
        
        // Store session ID in appropriate storage
        if (rememberMe) {
            localStorage.setItem('nclex_session_id', sessionId);
        } else {
            sessionStorage.setItem('nclex_session_id', sessionId);
        }
        
        return session;
    }

    async getSession(sessionId) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['sessions'], 'readonly');
            const store = transaction.objectStore('sessions');
            const request = store.get(sessionId);
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async deleteSession(sessionId) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['sessions'], 'readwrite');
            const store = transaction.objectStore('sessions');
            const request = store.delete(sessionId);
            
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    isSessionExpired(session) {
        return new Date() > new Date(session.expiresAt);
    }

    generateSessionId() {
        return 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    async initializeUserProgress(userId) {
        const initialProgress = {
            userId,
            questionsAnswered: 0,
            questionsCorrect: 0,
            currentStreak: 0,
            longestStreak: 0,
            studyTime: 0,
            categoriesProgress: {},
            flaggedQuestions: [],
            masteredQuestions: [],
            weakAreas: [],
            studyGoal: 20,
            dailyProgress: [],
            lastStudyDate: null,
            createdAt: new Date().toISOString()
        };
        
        const transaction = this.db.transaction(['userProgress'], 'readwrite');
        const store = transaction.objectStore('userProgress');
        await store.put(initialProgress);
        
        return initialProgress;
    }

    sanitizeUser(user) {
        const { passwordHash, ...sanitized } = user;
        return sanitized;
    }

    async loadCurrentSession() {
        const user = await this.getCurrentUser();
        if (user) {
            this.currentUser = user;
            // Store user data for quick access
            localStorage.setItem('nclex_user_data', JSON.stringify(user));
        }
    }

    // Public API for getting user stats
    async getUserStats(userId) {
        const progress = await this.getUserProgress(userId);
        if (!progress) return null;
        
        return {
            questionsAnswered: progress.questionsAnswered || 0,
            accuracy: progress.questionsAnswered > 0 ? 
                Math.round((progress.questionsCorrect / progress.questionsAnswered) * 100) : 0,
            currentStreak: progress.currentStreak || 0,
            longestStreak: progress.longestStreak || 0,
            studyTime: progress.studyTime || 0,
            studyGoal: progress.studyGoal || 20,
            lastStudyDate: progress.lastStudyDate
        };
    }
}

// Global instance
window.UserSystem = new UserManagementSystem();

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UserManagementSystem;
}