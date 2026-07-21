import { useSelector, useDispatch } from 'react-redux'
import {
  setCredentials,
  updateUser,
  logout,
  selectCurrentUser,
  selectIsAuthenticated,
  selectUserRole,
} from '@/store/authSlice'

export function useAuth() {
  const dispatch = useDispatch()
  const user = useSelector(selectCurrentUser)
  const isAuthenticated = useSelector(selectIsAuthenticated)
  const role = useSelector(selectUserRole)

  const loginUser = (userData) => {
    dispatch(setCredentials(userData))
  }

  const updateUserInfo = (userData) => {
    dispatch(updateUser(userData))
  }

  const logoutUser = () => {
    dispatch(logout())
  }

  return {
    user,
    isAuthenticated,
    role,
    loginUser,
    updateUserInfo,
    logoutUser,
  }
}
export default useAuth
