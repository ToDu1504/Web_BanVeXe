import { useSelector, useDispatch } from 'react-redux'
import {
  setSelectedTrip,
  setBookedSeats,
  addSeat,
  removeSeat,
  updatePassengerInfo,
  clearBooking,
  selectSelectedTrip,
  selectSelectedSeats,
  selectBookedSeats,
} from '@/store/bookingSlice'

export function useBooking() {
  const dispatch = useDispatch()
  const selectedTrip = useSelector(selectSelectedTrip)
  const selectedSeats = useSelector(selectSelectedSeats)
  const bookedSeats = useSelector(selectBookedSeats)

  const selectTrip = (trip) => {
    dispatch(setSelectedTrip(trip))
  }

  const selectBooked = (seats) => {
    dispatch(setBookedSeats(seats))
  }

  const toggleSeatSelection = (seatNumber) => {
    const isSelected = selectedSeats.some(s => s.seatNumber === seatNumber)
    if (isSelected) {
      dispatch(removeSeat(seatNumber))
    } else {
      dispatch(addSeat({ seatNumber }))
    }
  }

  const updatePassenger = (seatNumber, name, phone) => {
    dispatch(updatePassengerInfo({ seatNumber, passengerName: name, passengerPhone: phone }))
  }

  const resetBooking = () => {
    dispatch(clearBooking())
  }

  return {
    selectedTrip,
    selectedSeats,
    bookedSeats,
    selectTrip,
    selectBooked,
    toggleSeatSelection,
    updatePassenger,
    resetBooking,
  }
}
export default useBooking
