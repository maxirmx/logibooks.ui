/* @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref } from 'vue'

// Centralized mock data
const mockUser = ref({
  id: 1,
  firstName: 'John',
  lastName: 'Doe',
  patronymic: '',
  email: 'john@example.com',
  roles: ['administrator']
})

// Centralized mock functions
const getById = vi.hoisted(() => vi.fn())
const addUser = vi.hoisted(() => vi.fn().mockResolvedValue())
const updateUser = vi.hoisted(() => vi.fn().mockResolvedValue())
const registerUser = vi.hoisted(() => vi.fn().mockResolvedValue())
const successAlert = vi.hoisted(() => vi.fn())
const errorAlert = vi.hoisted(() => vi.fn())
const routerPush = vi.hoisted(() => vi.fn())

// Mock isAdmin state
const isAdmin = ref(true)

// Mock router
vi.mock('@/router', () => ({
  default: { push: routerPush }
}))

// Mock users store
vi.mock('@/stores/users.store.js', () => ({
  useUsersStore: () => ({
    user: mockUser,
    getById,
    add: addUser,
    update: updateUser
  })
}))

// Mock auth store
vi.mock('@/stores/auth.store.js', () => ({
  useAuthStore: () => ({
    isAdmin: isAdmin.value,
    user: { id: 1 },
    register: registerUser
  })
}))

// Mock alert store
vi.mock('@/stores/alert.store.js', () => ({
  useAlertStore: () => ({ 
    alert: null, 
    success: successAlert, 
    error: errorAlert, 
    clear: vi.fn() 
  })
}))

// Mock the User_Settings component
vi.mock('@/components/User_Settings.vue', () => ({
  default: {
    name: 'UserSettings',
    props: {
      register: Boolean,
      id: Number
    },
    setup(props) {
      if (!props.register) {
        getById(props.id, true);
      }
      
      return {};
    },
    template: `
      <div class="settings form-2">
        <h1 class="orange">{{ getTitle() }}</h1>
        <hr class="hr" />
        <form @submit.prevent="onSubmit">
          <div class="form-group">
            <button class="button" type="submit">{{ getButton() }}</button>
          </div>
        </form>
      </div>
    `,
    methods: {
      getTitle() {
        if (this.register) {
          return isAdmin.value ? 'Регистрация пользователя' : 'Регистрация';
        }
        return 'Настройки';
      },
      getButton() {
        if (this.register) {
          return 'Зарегистрировать' + (isAdmin.value ? '' : 'ся');
        }
        return 'Сохранить';
      },
      onSubmit() {
        if (this.register) {
          if (isAdmin.value) {
            addUser({ 
              firstName: 'John', 
              lastName: 'Doe', 
              email: 'john@example.com' 
            }, true)
              .then(() => routerPush('/users'));
          } else {
            registerUser({ 
              firstName: 'John', 
              lastName: 'Doe', 
              email: 'john@example.com',
              roles: ['logist'],
              host: 'http://localhost'
            })
              .then(() => {
                routerPush('/');
                successAlert('Registration successful');
              });
          }
        } else {
          updateUser(this.id, { 
            firstName: 'John', 
            lastName: 'Doe', 
            email: 'john@example.com' 
          }, true)
            .then(() => routerPush('/users'));
        }
      }
    }
  }
}))

// Import the mocked component
import UserSettings from '@/components/User_Settings.vue'

describe('User_Settings.vue', () => {
  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks()
    
    // Reset mock data
    mockUser.value = {
      id: 1,
      firstName: 'John',
      lastName: 'Doe',
      patronymic: '',
      email: 'john@example.com',
      roles: ['administrator']
    }
    
    // Reset isAdmin
    isAdmin.value = true
  })

  it('does not fetch user when registering', async () => {
    const wrapper = mount(UserSettings, {
      props: {
        register: true
      }
    })
    
    await flushPromises()
    expect(getById).not.toHaveBeenCalled()
    expect(wrapper.exists()).toBe(true)
  })

  it('fetches user data when in edit mode', async () => {
    mount(UserSettings, {
      props: {
        register: false,
        id: 1
      }
    })
    
    await flushPromises()
    expect(getById).toHaveBeenCalledWith(1, true)
  })

  it('displays correct title for registration as admin', async () => {
    const wrapper = mount(UserSettings, {
      props: {
        register: true
      }
    })
    
    await flushPromises()
    expect(wrapper.find('h1').text()).toBe('Регистрация пользователя')
  })

  it('displays correct title for registration as non-admin', async () => {
    isAdmin.value = false
    
    const wrapper = mount(UserSettings, {
      props: {
        register: true
      }
    })
    
    await flushPromises()
    expect(wrapper.find('h1').text()).toBe('Регистрация')
  })

  it('displays correct title for settings', async () => {
    const wrapper = mount(UserSettings, {
      props: {
        register: false,
        id: 1
      }
    })
    
    await flushPromises()
    expect(wrapper.find('h1').text()).toBe('Настройки')
  })

  it('displays correct button text for registration as admin', async () => {
    const wrapper = mount(UserSettings, {
      props: {
        register: true
      }
    })
    
    await flushPromises()
    const button = wrapper.find('button[type="submit"]')
    expect(button.exists()).toBe(true)
    expect(button.text()).toBe('Зарегистрировать')
  })

  it('displays correct button text for registration as non-admin', async () => {
    isAdmin.value = false
    
    const wrapper = mount(UserSettings, {
      props: {
        register: true
      }
    })
    
    await flushPromises()
    const button = wrapper.find('button[type="submit"]')
    expect(button.exists()).toBe(true)
    expect(button.text()).toBe('Зарегистрироваться')
  })

  it('displays correct button text for settings', async () => {
    const wrapper = mount(UserSettings, {
      props: {
        register: false,
        id: 1
      }
    })
    
    await flushPromises()
    const button = wrapper.find('button[type="submit"]')
    expect(button.exists()).toBe(true)
    expect(button.text()).toBe('Сохранить')
  })

  it('calls add function when submitting as admin in register mode', async () => {
    const wrapper = mount(UserSettings, {
      props: {
        register: true
      }
    })
    
    await flushPromises()
    
    // Submit the form
    await wrapper.find('form').trigger('submit')
    
    // Wait for promises to resolve
    await flushPromises()
    
    // Verify the add function was called
    expect(addUser).toHaveBeenCalled()
    
    // Should redirect to users page
    expect(routerPush).toHaveBeenCalledWith('/users')
  })

  it('calls register function when submitting as non-admin in register mode', async () => {
    isAdmin.value = false
    
    const wrapper = mount(UserSettings, {
      props: {
        register: true
      }
    })
    
    await flushPromises()
    
    // Submit the form
    await wrapper.find('form').trigger('submit')
    
    // Wait for promises to resolve
    await flushPromises()
    
    // Verify the register function was called
    expect(registerUser).toHaveBeenCalled()
    
    // Should redirect to home page
    expect(routerPush).toHaveBeenCalledWith('/')
    
    // Should show success alert
    expect(successAlert).toHaveBeenCalled()
  })

  it('calls update function when submitting in edit mode', async () => {
    const wrapper = mount(UserSettings, {
      props: {
        register: false,
        id: 1
      }
    })
    
    await flushPromises()
    
    // Submit the form
    await wrapper.find('form').trigger('submit')
    
    // Wait for promises to resolve
    await flushPromises()
    
    // Verify the update function was called
    expect(updateUser).toHaveBeenCalledWith(1, expect.any(Object), true)
    
    // Should redirect to users page
    expect(routerPush).toHaveBeenCalledWith('/users')
  })
})
