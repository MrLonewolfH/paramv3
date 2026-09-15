(() => {
  'use strict'

  const root = document.documentElement
  const $ = (selector, scope = document) => scope.querySelector(selector)
  const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)]
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)')
  const connection = navigator.connection
  const saveData = Boolean(connection?.saveData || /(^|-)2g$/.test(connection?.effectiveType || ''))
  let motionEnabled = !reducedMotion.matches && !saveData
  let scene = null
  let sceneLoading = false
  let sceneFailed = false
  let explicitMotionChoice = false
  root.dataset.motion = motionEnabled ? 'active' : 'paused'
  root.classList.add('js')

  const courseNames = {
    jee: 'IIT-JEE',
    neet: 'NEET',
    'iit-foundation': 'IIT Foundation',
    'neet-foundation': 'NEET Foundation',
    guidance: 'Help me choose / School support',
  }
  const coursePages = { jee: 'iit-jee', neet: 'neet', 'iit-foundation': 'iit-foundation', 'neet-foundation': 'neet-foundation' }
  const motionToggle = $('#motion-toggle')
  const sceneStatus = $('#scene-status')

  function updateMotionControl() {
    motionToggle.setAttribute('aria-pressed', String(!motionEnabled))
    motionToggle.setAttribute('aria-label', motionEnabled ? 'Pause animations' : 'Enable animations')
    $('span', motionToggle).textContent = motionEnabled ? 'Pause motion' : 'Enable motion'
    $('use', motionToggle).setAttribute('href', `./assets/icons.svg#${motionEnabled ? 'pause' : 'play'}`)
    if (!motionEnabled) sceneStatus.textContent = 'Still beautiful. Motion paused.'
    else if (scene) sceneStatus.textContent = 'Move your pointer to explore'
    else if (sceneFailed) sceneStatus.textContent = 'Static view · 3D unavailable'
    else sceneStatus.textContent = 'A fresh perspective on learning'
  }

  async function loadScene() {
    if (!motionEnabled || scene || sceneLoading || sceneFailed) return
    sceneLoading = true
    try {
      const { createLearningScene } = await import('./scene.js')
      if (!motionEnabled) return
      scene = createLearningScene($('#learning-scene'), $('#scene-canvas'), {
        onReady() { $('#learning-scene').dataset.state = 'live' },
        onError() {
          sceneFailed = true
          $('#learning-scene').dataset.state = 'static'
          sceneStatus.textContent = 'Static view · 3D unavailable'
        },
      })
      scene.setPaused(!motionEnabled)
    } catch {
      sceneFailed = true
      $('#learning-scene').dataset.state = 'static'
    } finally {
      sceneLoading = false
      updateMotionControl()
    }
  }

  function setMotion(enabled, explicit = false) {
    motionEnabled = enabled
    if (explicit) explicitMotionChoice = true
    root.dataset.motion = enabled ? 'active' : 'paused'
    scene?.setPaused(!enabled)
    if (!enabled) {
      $$('[data-tilt]').forEach(card => {
        card.style.setProperty('--rotate-x', '0deg')
        card.style.setProperty('--rotate-y', '0deg')
      })
      $$('.reveal-pending').forEach(element => element.classList.remove('reveal-pending'))
    } else loadScene()
    updateMotionControl()
  }
  motionToggle.addEventListener('click', () => setMotion(!motionEnabled, true))
  reducedMotion.addEventListener('change', event => {
    if (!explicitMotionChoice) setMotion(!event.matches && !saveData)
  })
  updateMotionControl()
  if ('requestIdleCallback' in window) requestIdleCallback(loadScene, { timeout: 1800 })
  else setTimeout(loadScene, 500)

  const menuToggle = $('.menu-toggle')
  const navigation = $('#primary-navigation')
  function closeMenu(returnFocus = false) {
    navigation.classList.remove('is-open')
    menuToggle.setAttribute('aria-expanded', 'false')
    menuToggle.setAttribute('aria-label', 'Open navigation')
    $('use', menuToggle).setAttribute('href', './assets/icons.svg#menu')
    if (returnFocus) menuToggle.focus()
  }
  menuToggle.addEventListener('click', () => {
    const open = menuToggle.getAttribute('aria-expanded') !== 'true'
    navigation.classList.toggle('is-open', open)
    menuToggle.setAttribute('aria-expanded', String(open))
    menuToggle.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation')
    $('use', menuToggle).setAttribute('href', `./assets/icons.svg#${open ? 'x' : 'menu'}`)
  })
  $$('a', navigation).forEach(link => link.addEventListener('click', () => closeMenu()))
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && navigation.classList.contains('is-open')) closeMenu(true)
  })
  document.addEventListener('pointerdown', event => {
    if (navigation.classList.contains('is-open') && !$('.site-header').contains(event.target)) closeMenu()
  })
  matchMedia('(min-width: 768px)').addEventListener('change', event => { if (event.matches) closeMenu() })

  const header = $('.site-header')
  let headerFrame = 0
  function updateHeader() {
    if (headerFrame) return
    headerFrame = requestAnimationFrame(() => {
      header.classList.toggle('is-scrolled', scrollY > 30)
      headerFrame = 0
    })
  }
  addEventListener('scroll', updateHeader, { passive: true })
  updateHeader()

  if ('IntersectionObserver' in window) {
    const activeSectionObserver = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue
        $$('a', navigation).forEach(link => link.classList.toggle('is-current', link.hash === `#${entry.target.id}`))
      }
    }, { rootMargin: '-15% 0px -65% 0px', threshold: 0 })
    $$('main section[id]').forEach(section => activeSectionObserver.observe(section))
  }

  const courseCards = $$('.course-card')
  $$('.filter-button').forEach(button => button.addEventListener('click', () => {
    const selected = button.dataset.filter
    $$('.filter-button').forEach(filter => filter.setAttribute('aria-pressed', String(filter === button)))
    let count = 0
    courseCards.forEach(card => {
      const visible = selected === 'all' || card.dataset.categories.split(' ').includes(selected)
      card.hidden = !visible
      if (visible) count++
    })
    $('#filter-status').textContent = `${count} ${count === 1 ? 'course' : 'courses'} shown: ${button.textContent.trim()}.`
  }))

  const dialogTriggers = new WeakMap()
  function openDialog(dialog, trigger) {
    if (typeof dialog.showModal !== 'function') return false
    closeMenu()
    dialogTriggers.set(dialog, trigger || document.activeElement)
    dialog.showModal()
    document.body.classList.add('modal-open')
    scene?.setPaused(true)
    return true
  }
  $$('dialog').forEach(dialog => {
    dialog.addEventListener('click', event => {
      if (event.target !== dialog) return
      const rect = dialog.getBoundingClientRect()
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close()
    })
    dialog.addEventListener('close', () => {
      if (!$('dialog[open]')) {
        document.body.classList.remove('modal-open')
        scene?.setPaused(!motionEnabled)
      }
      const trigger = dialogTriggers.get(dialog)
      if (trigger?.isConnected) trigger.focus({ preventScroll: true })
    })
    $$('[data-close-dialog]', dialog).forEach(button => button.addEventListener('click', () => dialog.close()))
  })
  $$('[data-open-dialog]').forEach(button => button.addEventListener('click', () => {
    const dialog = document.getElementById(button.dataset.openDialog)
    if (dialog) openDialog(dialog, button)
  }))

  const courseDialog = $('#course-dialog')
  let activeCourse = 'jee'
  $$('[data-course]').forEach(link => link.addEventListener('click', event => {
    const course = link.dataset.course
    if (!Object.hasOwn(coursePages, course)) return
    $('#student-course').value = course
    clearFieldError($('#student-course'))
    if (typeof courseDialog.showModal !== 'function') return
    event.preventDefault()
    activeCourse = course
    $('#course-dialog-title').textContent = courseNames[course]
    $$('[data-course-content]').forEach(article => { article.hidden = article.dataset.courseContent !== course })
    $('#course-source').href = `https://paramedusolutions.com/${coursePages[course]}`
    $('#course-enquire').textContent = `Enquire about ${courseNames[course]}`
    openDialog(courseDialog, link)
    courseDialog.scrollTop = 0
  }))
  $('#course-enquire').addEventListener('click', () => {
    courseDialog.close()
    resetEnquiryView()
    $('#student-course').value = activeCourse
    clearFieldError($('#student-course'))
    requestAnimationFrame(() => {
      $('#enquire').scrollIntoView({ behavior: motionEnabled ? 'smooth' : 'instant', block: 'start' })
      $('#student-name').focus({ preventScroll: true })
    })
  })

  const stories = $$('[data-story]')
  const storyDots = $$('[data-story-index]')
  let activeStory = 0
  function showStory(index) {
    activeStory = (index + stories.length) % stories.length
    stories.forEach((story, i) => { story.hidden = i !== activeStory })
    storyDots.forEach((dot, i) => dot.setAttribute('aria-pressed', String(i === activeStory)))
    $('#story-count').textContent = `${String(activeStory + 1).padStart(2, '0')} / ${String(stories.length).padStart(2, '0')}`
  }
  $('#story-prev').addEventListener('click', () => showStory(activeStory - 1))
  $('#story-next').addEventListener('click', () => showStory(activeStory + 1))
  storyDots.forEach(dot => dot.addEventListener('click', () => showStory(Number(dot.dataset.storyIndex))))
  $('.story-dots').addEventListener('keydown', event => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
    event.preventDefault()
    showStory(activeStory + (event.key === 'ArrowLeft' ? -1 : 1))
    storyDots[activeStory].focus()
  })

  const galleryItems = $$('[data-gallery]')
  const galleryDialog = $('#gallery-dialog')
  let activeGalleryImage = 0
  function showGalleryImage(index) {
    activeGalleryImage = (index + galleryItems.length) % galleryItems.length
    const item = galleryItems[activeGalleryImage]
    const originalImage = $('img', item)
    const fullImage = $('#gallery-full-image')
    fullImage.src = item.href
    fullImage.alt = originalImage.alt
    $('#gallery-image-caption').textContent = $('.gallery-caption', item).textContent.trim()
    $('#gallery-count').textContent = `${activeGalleryImage + 1} / ${galleryItems.length}`
  }
  galleryItems.forEach((item, index) => item.addEventListener('click', event => {
    if (typeof galleryDialog.showModal !== 'function') return
    event.preventDefault()
    showGalleryImage(index)
    openDialog(galleryDialog, item)
  }))
  $('#gallery-prev').addEventListener('click', () => showGalleryImage(activeGalleryImage - 1))
  $('#gallery-next').addEventListener('click', () => showGalleryImage(activeGalleryImage + 1))
  galleryDialog.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault()
      showGalleryImage(activeGalleryImage + (event.key === 'ArrowLeft' ? -1 : 1))
    }
  })

  const form = $('#enquiry-form')
  const fields = { name: $('#student-name'), phone: $('#student-phone'), class: $('#student-class'), course: $('#student-course') }
  const allowedClasses = new Set([...fields.class.options].map(option => option.value).filter(Boolean))
  function setFieldError(input, message) {
    input.setAttribute('aria-invalid', 'true')
    document.getElementById(input.getAttribute('aria-describedby')).textContent = message
  }
  function clearFieldError(input) {
    input.removeAttribute('aria-invalid')
    const description = input.getAttribute('aria-describedby')
    if (description) document.getElementById(description).textContent = ''
  }
  Object.values(fields).forEach(field => {
    field.addEventListener('input', () => clearFieldError(field))
    field.addEventListener('change', () => clearFieldError(field))
  })
  function cleanText(value, maxLength) {
    return String(value).replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, maxLength)
  }
  function resetEnquiryView() {
    $('#enquiry-form-view').hidden = false
    $('#enquiry-ready').hidden = true
    $('#copy-status').textContent = ''
    $('#prepared-message').value = ''
    $('#whatsapp-link').removeAttribute('href')
    $('#email-link').removeAttribute('href')
  }
  form.addEventListener('keydown', event => {
    if (event.key === 'Enter' && (event.isComposing || event.keyCode === 229)) event.preventDefault()
  })
  form.addEventListener('submit', event => {
    event.preventDefault()
    const name = cleanText(fields.name.value, 80)
    const phone = cleanText(fields.phone.value, 20)
    const schoolClass = fields.class.value
    const course = fields.course.value
    const phoneDigits = phone.replace(/\D/g, '')
    const errors = []
    Object.values(fields).forEach(clearFieldError)
    if (name.length < 2 || !/\p{L}/u.test(name)) errors.push([fields.name, 'Please enter the student’s name (at least 2 characters).'])
    if (!/^\+?[\d\s()-]+$/.test(phone) || phoneDigits.length < 10 || phoneDigits.length > 15) errors.push([fields.phone, 'Enter a valid phone number with 10–15 digits.'])
    if (!allowedClasses.has(schoolClass)) errors.push([fields.class, 'Please select your current class.'])
    if (!Object.hasOwn(courseNames, course)) errors.push([fields.course, 'Please choose a program or ask for guidance.'])
    if (errors.length) {
      errors.forEach(([field, error]) => setFieldError(field, error))
      errors[0][0].focus()
      return
    }
    const note = cleanText($('#student-message').value, 500)
    const message = [
      'Hello Param Institute,',
      'I would like to enquire about a free demo class and course details.',
      '',
      `Student name: ${name}`,
      `Phone: ${phone}`,
      `Current class: ${schoolClass}`,
      `Interested in: ${courseNames[course]}`,
      ...(note ? ['', `My question: ${note}`] : []),
      '',
      'Please let me know about the right batch, current fees, and a suitable demo time. Thank you!',
    ].join('\n')
    $('#prepared-message').value = message
    const whatsapp = new URL('https://wa.me/917310334198')
    whatsapp.searchParams.set('text', message)
    $('#whatsapp-link').href = whatsapp.toString()
    $('#email-link').href = `mailto:sb@goparam.com?subject=${encodeURIComponent(`Free demo enquiry — ${courseNames[course]}`)}&body=${encodeURIComponent(message)}`
    $('#enquiry-form-view').hidden = true
    $('#enquiry-ready').hidden = false
    $('#ready-title').focus({ preventScroll: true })
    $('#enquire').scrollIntoView({ behavior: motionEnabled ? 'smooth' : 'instant', block: 'start' })
  })
  $('#edit-enquiry').addEventListener('click', () => {
    resetEnquiryView()
    fields.name.focus({ preventScroll: true })
  })
  $('#copy-message').addEventListener('click', async () => {
    const preparedMessage = $('#prepared-message')
    const status = $('#copy-status')
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable')
      await navigator.clipboard.writeText(preparedMessage.value)
      status.textContent = 'Message copied. Paste it into your preferred messaging app and send it when you’re ready.'
    } catch {
      preparedMessage.focus()
      preparedMessage.select()
      status.textContent = 'Your browser does not allow automatic copying here. The message is selected — use your device’s Copy command, then paste it into your preferred app.'
    }
  })
  $('[type="submit"]', form).disabled = false

  if ('IntersectionObserver' in window && motionEnabled) {
    const revealObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return
        entry.target.classList.remove('reveal-pending')
        entry.target.classList.add('is-revealed')
        revealObserver.unobserve(entry.target)
      })
    }, { threshold: 0.08, rootMargin: '0px 0px 30px 0px' })
    $$('[data-reveal]').forEach(element => {
      if (element.getBoundingClientRect().top > innerHeight) element.classList.add('reveal-pending')
      revealObserver.observe(element)
    })
  }

  if (matchMedia('(hover: hover) and (pointer: fine)').matches) {
    $$('[data-tilt]').forEach(card => {
      let rect = null
      let frame = 0
      let x = 0
      let y = 0
      card.addEventListener('pointerenter', () => { rect = card.getBoundingClientRect() })
      card.addEventListener('pointermove', event => {
        if (!motionEnabled || !rect) return
        x = (event.clientX - rect.left) / rect.width - 0.5
        y = (event.clientY - rect.top) / rect.height - 0.5
        if (frame) return
        frame = requestAnimationFrame(() => {
          card.style.setProperty('--rotate-y', `${(x * 5).toFixed(2)}deg`)
          card.style.setProperty('--rotate-x', `${(-y * 4).toFixed(2)}deg`)
          frame = 0
        })
      }, { passive: true })
      card.addEventListener('pointerleave', () => {
        if (frame) cancelAnimationFrame(frame)
        frame = 0
        rect = null
        card.style.setProperty('--rotate-x', '0deg')
        card.style.setProperty('--rotate-y', '0deg')
      })
    })
  }
  $('#copyright-year').textContent = String(new Date().getFullYear())
  addEventListener('pagehide', event => {
    if (event.persisted) scene?.setPaused(true)
    else scene?.dispose()
  })
  addEventListener('pageshow', event => { if (event.persisted) scene?.setPaused(!motionEnabled) })
})()
