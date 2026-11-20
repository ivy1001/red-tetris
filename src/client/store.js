import { createStore, applyMiddleware, combineReducers } from 'redux'
import createLogger from 'redux-logger'
import thunk from 'redux-thunk'
import { storeStateMiddleWare } from './middleware/storeStateMiddleWare'
import reducer from './reducers'
import game from './reducers/game'

const rootReducer = combineReducers({
  reducer: reducer,
  game: game,
})

const store = createStore(
  rootReducer,
  applyMiddleware(thunk, createLogger(), storeStateMiddleWare)
)

export default store