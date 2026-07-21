import { createSlice } from '@reduxjs/toolkit'

const initialState = {
  selectedTrip: null,     // Object chuyến xe đã chọn
  selectedSeats: [],      // [{ seatNumber, passengerName, passengerPhone }]
  bookedSeats: [],        // Số ghế đã đặt (fetch từ API)
}

const bookingSlice = createSlice({
  name: 'booking',
  initialState,
  reducers: {
    setSelectedTrip: (state, action) => {
      state.selectedTrip = action.payload
      state.selectedSeats = []
      state.bookedSeats = []
    },
    setBookedSeats: (state, action) => {
      state.bookedSeats = action.payload
    },
    addSeat: (state, action) => {
      const seat = action.payload  // { seatNumber }
      const exists = state.selectedSeats.find(s => s.seatNumber === seat.seatNumber)
      if (!exists) {
        state.selectedSeats.push({
          seatNumber: seat.seatNumber,
          passengerName: '',
          passengerPhone: '',
        })
      }
    },
    removeSeat: (state, action) => {
      state.selectedSeats = state.selectedSeats.filter(s => s.seatNumber !== action.payload)
    },
    updatePassengerInfo: (state, action) => {
      const { seatNumber, passengerName, passengerPhone } = action.payload
      const seat = state.selectedSeats.find(s => s.seatNumber === seatNumber)
      if (seat) {
        seat.passengerName = passengerName
        seat.passengerPhone = passengerPhone
      }
    },
    clearBooking: (state) => {
      state.selectedTrip = null
      state.selectedSeats = []
      state.bookedSeats = []
    },
  },
})

export const { setSelectedTrip, setBookedSeats, addSeat, removeSeat, updatePassengerInfo, clearBooking } = bookingSlice.actions

// Selectors
export const selectSelectedTrip = (state) => state.booking.selectedTrip
export const selectSelectedSeats = (state) => state.booking.selectedSeats
export const selectBookedSeats = (state) => state.booking.bookedSeats

export default bookingSlice.reducer
