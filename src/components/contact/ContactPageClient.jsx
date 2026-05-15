'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useTranslation } from '@/i18n/useTranslation'
import { getContactSettings, submitContactForm } from '@/lib/cms-client'
import JsonLd from '@/components/JsonLd'
import { getPreferredLang, supportedLangs, langPrefix } from '@/i18n/translations'
import { usePathLang } from '@/hooks/usePathLang'
import '@/styles/ContactPage.css'

/**
 * @param {{ heroTitle?: string }} props
 * `heroTitle` from the server page aligns contact `<h1>` with metadata and SSR HTML.
 */
export default function ContactPageClient({ heroTitle } = {}) {
  const lang = usePathLang()
  const t = useTranslation(lang)
  const localeForApi = supportedLangs.includes(lang) ? lang : getPreferredLang()
  const [settings, setSettings] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState(false)
  const [sentSummary, setSentSummary] = useState(null)
  const [formError, setFormError] = useState('')
  const [form, setForm] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
    accepts_terms: false,
  })

  useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])

  useEffect(() => {
    setLoading(true)
    setError(null)
    getContactSettings(localeForApi)
      .then(setSettings)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [localeForApi])

  const subjectOptions = [
    { value: '', label: t('contact.chooseSubject') },
    { value: 'general', label: t('contact.subjectGeneral') },
    { value: 'support', label: t('contact.subjectSupport') },
    { value: 'feedback', label: t('contact.subjectFeedback') },
    { value: 'other', label: t('contact.subjectOther') },
  ]

  function subjectLabelFor(value) {
    const opt = subjectOptions.find((o) => o.value === value)
    return opt?.label || value || t('contact.subjectGeneral')
  }

  function contactDetailsVisible(s) {
    if (!s || typeof s !== 'object') return false
    const e = String(s.contact_email ?? '').trim()
    const p = String(s.contact_phone ?? '').trim()
    const a = String(s.contact_address ?? '').trim()
    return Boolean(e || p || a)
  }

  function handleChange(e) {
    const { name, value, type, checked } = e.target
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
    setFormError('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.accepts_terms) {
      setFormError(t('contact.errorTerms'))
      return
    }
    setFormError('')
    setSubmitting(true)
    try {
      const name = form.name.trim()
      const email = form.email.trim()
      const subjectVal = form.subject || 'general'
      const subjectText = subjectLabelFor(subjectVal)
      const message = form.message.trim()
      await submitContactForm(
        {
          name,
          email,
          subject: subjectText,
          message,
          accepts_terms: true,
        },
        localeForApi,
      )
      setSentSummary({ name, email, subject: subjectText, message })
      setSubmitSuccess(true)
      setForm({ name: '', email: '', subject: '', message: '', accepts_terms: false })
    } catch (err) {
      const msg = err.message || t('contact.errorSend')
      setFormError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  const lp = langPrefix(lang)
  const heading =
    typeof heroTitle === 'string' && heroTitle.trim() !== '' ? heroTitle.trim() : t('contact.title')

  if (loading) {
    return (
      <div className="cp-my-contact-page cp-my-wrap">
        <h1 className="cp-my-contact-page-title">{heading}</h1>
        <p className="cp-my-contact-page-loading">Loading…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="cp-my-contact-page cp-my-wrap">
        <h1 className="cp-my-contact-page-title">{heading}</h1>
        <p className="cp-my-contact-page-error">{error}</p>
        <Link href={`${lp}/`} className="cp-my-contact-page-back">
          ← {t('contact.backHome')}
        </Link>
      </div>
    )
  }

  return (
    <article className="cp-my-contact-page cp-my-wrap">
      <JsonLd data={settings?.json_ld} />
      <div className="cp-my-contact-page-grid">
        <div className="cp-my-contact-page-intro">
          <h1 className="cp-my-contact-page-title">{heading}</h1>
          <p className="cp-my-contact-page-intro-text">{t('contact.intro')}</p>
          <div className="cp-my-contact-page-details" aria-label={t('contact.detailsHeading')}>
            {contactDetailsVisible(settings) ? (
              <ul className="cp-my-contact-details-list">
                {String(settings.contact_email ?? '').trim() !== '' && (
                  <li className="cp-my-contact-details-item">
                    <span className="cp-my-contact-details-label">{t('contact.email')}</span>
                    <a
                      className="cp-my-contact-details-value cp-my-contact-details-link"
                      href={`mailto:${String(settings.contact_email).trim()}`}
                    >
                      {String(settings.contact_email).trim()}
                    </a>
                  </li>
                )}
                {String(settings.contact_phone ?? '').trim() !== '' && (
                  <li className="cp-my-contact-details-item">
                    <span className="cp-my-contact-details-label">{t('contact.phone')}</span>
                    <a
                      className="cp-my-contact-details-value cp-my-contact-details-link"
                      href={`tel:${String(settings.contact_phone).replace(/\s+/g, '')}`}
                    >
                      {String(settings.contact_phone).trim()}
                    </a>
                  </li>
                )}
                {String(settings.contact_address ?? '').trim() !== '' && (
                  <li className="cp-my-contact-details-item">
                    <span className="cp-my-contact-details-label">{t('contact.address')}</span>
                    <span className="cp-my-contact-details-value cp-my-contact-details-multiline">
                      {String(settings.contact_address).trim()}
                    </span>
                  </li>
                )}
              </ul>
            ) : (
              <p className="cp-my-contact-page-no-details">{t('contact.noDetails')}</p>
            )}
          </div>
        </div>
        <div className="cp-my-contact-page-form-wrap">
          {submitSuccess ? (
            <div className="cp-my-contact-form-success" role="status">
              <p className="cp-my-contact-form-success-text">{t('contact.successMessage')}</p>
              {sentSummary && (
                <dl className="cp-my-contact-form-sent-summary">
                  <div className="cp-my-contact-form-sent-row">
                    <dt>{t('contact.yourName')}</dt>
                    <dd>{sentSummary.name}</dd>
                  </div>
                  <div className="cp-my-contact-form-sent-row">
                    <dt>{t('contact.yourEmail')}</dt>
                    <dd>{sentSummary.email}</dd>
                  </div>
                  <div className="cp-my-contact-form-sent-row">
                    <dt>{t('contact.subject')}</dt>
                    <dd>{sentSummary.subject}</dd>
                  </div>
                  <div className="cp-my-contact-form-sent-row">
                    <dt>{t('contact.message')}</dt>
                    <dd className="cp-my-contact-form-sent-message">{sentSummary.message}</dd>
                  </div>
                </dl>
              )}
              <button
                type="button"
                className="cp-my-contact-form-success-again"
                onClick={() => {
                  setSubmitSuccess(false)
                  setSentSummary(null)
                }}
              >
                {t('contact.sendAnother')}
              </button>
            </div>
          ) : (
            <form className="cp-my-contact-form" onSubmit={handleSubmit} noValidate>
              <div className="cp-my-contact-form-row">
                <label className="cp-my-contact-form-label" htmlFor="contact-name">
                  {t('contact.yourName')} <span className="cp-my-contact-form-required">*</span>
                </label>
                <input
                  id="contact-name"
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  className="cp-my-contact-form-input"
                  placeholder={t('contact.yourName')}
                  required
                  autoComplete="name"
                />
              </div>
              <div className="cp-my-contact-form-row">
                <label className="cp-my-contact-form-label" htmlFor="contact-email">
                  {t('contact.yourEmail')} <span className="cp-my-contact-form-required">*</span>
                </label>
                <input
                  id="contact-email"
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  className="cp-my-contact-form-input"
                  placeholder={t('contact.yourEmail')}
                  required
                  autoComplete="email"
                />
              </div>
              <div className="cp-my-contact-form-row">
                <label className="cp-my-contact-form-label" htmlFor="contact-subject">
                  {t('contact.subject')} <span className="cp-my-contact-form-required">*</span>
                </label>
                <select
                  id="contact-subject"
                  name="subject"
                  value={form.subject}
                  onChange={handleChange}
                  className="cp-my-contact-form-select"
                  required
                >
                  {subjectOptions.map((opt) => (
                    <option key={opt.value || 'empty'} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="cp-my-contact-form-row">
                <label className="cp-my-contact-form-label" htmlFor="contact-message">
                  {t('contact.message')} <span className="cp-my-contact-form-required">*</span>
                </label>
                <textarea
                  id="contact-message"
                  name="message"
                  value={form.message}
                  onChange={handleChange}
                  className="cp-my-contact-form-textarea"
                  placeholder={t('contact.writeMessage')}
                  required
                  rows={5}
                />
              </div>
              <div className="cp-my-contact-form-row cp-my-contact-form-consent">
                <label className="cp-my-contact-form-checkbox-label">
                  <input
                    type="checkbox"
                    name="accepts_terms"
                    checked={form.accepts_terms}
                    onChange={handleChange}
                    className="cp-my-contact-form-checkbox"
                  />
                  <span>
                    {t('contact.iAccept')}{' '}
                    <Link href={`${lp}/legal/terms`} className="cp-my-contact-form-legal-link">
                      {t('contact.termsAndConditions')}
                    </Link>
                    {' and '}
                    <Link href={`${lp}/legal/privacy-policy`} className="cp-my-contact-form-legal-link">
                      {t('contact.legalPrivacy')}
                    </Link>
                  </span>
                </label>
              </div>
              {formError && (
                <p className="cp-my-contact-form-error" role="alert">
                  {formError}
                </p>
              )}
              <button type="submit" className="cp-my-contact-form-submit" disabled={submitting}>
                {submitting ? 'Sending…' : t('contact.sendMessage')}
              </button>
            </form>
          )}
        </div>
      </div>
      <footer className="cp-my-contact-page-footer">
        <Link href={`${lp}/`} className="cp-my-contact-page-back">
          ← {t('contact.backHome')}
        </Link>
      </footer>
    </article>
  )
}
