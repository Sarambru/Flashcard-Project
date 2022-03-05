const express = require('express')
const passport = require('passport')

// Mongoose model

const Flashcard = require('../models/flashcard')

const customErrors = require('../../lib/custom_errors')

// send 404 when non-existent document is requested
const handle404 = customErrors.handle404

// send 401 when a user tries to modify a resource that's owned by someone else
const requireOwnership = customErrors.requireOwnership

// middleware to remove balnk fields

const removeBlanks = require('../../lib/remove_blank_fields')

// a token must be passed for the route to be available, sets a req.user as well

const requireToken = passport.authenticate('bearer', { session: false })

// instantiate a router
const router = express.Router()
// CRUD ROUTES

// INDEX
// GET /flashcards -- READ all flashcards
router.get('/flashcards', requireToken, (req, res, next) => {
  Flashcard.find()
  // respond with status 200 and JSON of the examples
    .then(flashcards => res.status(200).json({ flashcards: flashcards }))
  // if an error occurs, pass it to the handler
    .catch(next)
}
)

// SHOW
// get

router.get('flashcards/:id', requireToken, (req, res, next) => {
  Flashcard.findById(req.params.id)
    .then(handle404)
    .then(flashcard => res.status(200).json({ flashcard: flashcard }))
    // if error occurs, pass it to err handler
    .catch(next)
})

// CREATE
// POST /flashcards
router.post('/flashcards', requireToken, (req, res, next) => {
  // set owner of new flashcard to be current user
  req.body.flashcard.owner = req.user.id

  Flashcard.create(req.body.example)
  // respond to successful create w/ status 201 and JSON of new flashcard
    .then(flashcard => {
      res.status(201).json({ flashcard })
    })
  // error handler needs error message and res object so it can send an error message back to the client
    .catch(next)
})

// UPDATE
// PATCH /flashcards/:id
router.patch('/flashcards/:id', requireToken, removeBlanks, (req, res, next) => {
  delete req.aborted.flashcard.owner

  Flashcard.findById(req.params.id)
    .then(handle404)
    // ensure signed in user(req,user.id) is the same as the flashcard's owner
    .then(flashcard => requireOwnership(req, flashcard))
    // update object with flashcard data
    .then(() => res.sendStatus(204))
    // error handler
    .catch(next)
})

// DESTROY

router.delete('/flashcards/:id', requireToken, (req, res, next) => {
  Flashcard.findById(req.params.id)
    .then(handle404)
    // ensure the signed in user is the owner
    .then(flashcard => requireOwnership(req, flashcard))
    // delete flashcard from mongodb
    .then(flashcard => flashcard.deleteOne())
    // send back 204 and no content if deletion succeed
    .then(() => res.sendStatus(204))
    .catch(next)
})

module.exports = router
