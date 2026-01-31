import { http } from './http'

export const authApi = {
  async login(payload) {
    //  { email, password }
    const { data } = await http.post('/auth/login', payload)
    return data // { token, user }
  },

  async logout() {
    const { data } = await http.post('/auth/logout')
    return data
  },
}
