import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Trash2 } from 'lucide-react';
import { useId } from 'react';
import { Controller, useFieldArray, useForm } from 'react-hook-form';
import { buttonClassName } from '../../../core/components/buttonStyles';
import { FormField, inputClassName } from '../../../core/components/FormField';
import { UnsavedChangesGuard } from '../../../core/forms/UnsavedChangesGuard';
import type { MediaSummary } from '../../media/schemas/mediaSchema';
import {
  emptySectionData,
  readSectionData,
  type SectionDataMap,
  sectionDataSchemas,
  type SectionType,
} from '../schemas/sectionSchema';
import {
  ImageInput,
  LinkInput,
  ParagraphsInput,
  SectionFormShell,
  TextInput,
} from './SectionFields';

interface CommonProps {
  media: Record<string, MediaSummary>;
  pending: boolean;
  error: unknown;
  onCancel: () => void;
  onReload?: () => void;
}

interface TypedFormProps<T extends SectionType> extends CommonProps {
  initial: SectionDataMap[T];
  onSave: (data: SectionDataMap[T]) => void;
}

function shellProps<T extends SectionType>(
  props: TypedFormProps<T>,
  form: { handleSubmit: (fn: (values: SectionDataMap[T]) => void) => () => Promise<void> },
) {
  return {
    onSubmit: () => void form.handleSubmit(props.onSave)(),
    onCancel: props.onCancel,
    pending: props.pending,
    error: props.error,
    onReload: props.onReload,
  };
}

function HeroForm(props: TypedFormProps<'hero'>) {
  const form = useForm<SectionDataMap['hero']>({
    resolver: zodResolver(sectionDataSchemas.hero),
    defaultValues: props.initial,
  });
  return (
    <SectionFormShell {...shellProps(props, form)}>
      <UnsavedChangesGuard when={form.formState.isDirty && !props.pending} />
      <TextInput form={form} name="eyebrow" label="Surtitre (facultatif)" />
      <TextInput form={form} name="title" label="Titre" />
      <TextInput form={form} name="subtitle" label="Sous-titre (facultatif)" multiline />
      <ImageInput form={form} name="imageId" label="Image de fond" media={props.media} />
      <LinkInput form={form} name="primaryLink" label="Bouton principal" optional />
      <LinkInput form={form} name="secondaryLink" label="Bouton secondaire" optional />
    </SectionFormShell>
  );
}

function RichTextForm(props: TypedFormProps<'richText'>) {
  const form = useForm<SectionDataMap['richText']>({
    resolver: zodResolver(sectionDataSchemas.richText),
    defaultValues: props.initial,
  });
  return (
    <SectionFormShell {...shellProps(props, form)}>
      <UnsavedChangesGuard when={form.formState.isDirty && !props.pending} />
      <TextInput form={form} name="title" label="Titre (facultatif)" />
      <ParagraphsInput form={form} name="paragraphs" label="Texte" />
    </SectionFormShell>
  );
}

function CardsForm(props: TypedFormProps<'cards'>) {
  const form = useForm<SectionDataMap['cards']>({
    resolver: zodResolver(sectionDataSchemas.cards),
    defaultValues: props.initial,
  });
  const items = useFieldArray({ control: form.control, name: 'items' });
  const id = useId();
  return (
    <SectionFormShell {...shellProps(props, form)}>
      <UnsavedChangesGuard when={form.formState.isDirty && !props.pending} />
      <TextInput form={form} name="title" label="Titre (facultatif)" />
      <TextInput form={form} name="intro" label="Introduction (facultatif)" multiline />
      <ol className="space-y-3">
        {items.fields.map((field, index) => (
          <li key={field.id} className="space-y-3 rounded-lg border border-forest/10 p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">Carte {index + 1}</p>
              <button
                type="button"
                disabled={items.fields.length === 1}
                onClick={() => items.remove(index)}
                aria-label="Supprimer la carte"
                className={buttonClassName('ghost', 'px-2 text-red-700')}
              >
                <Trash2 aria-hidden="true" className="size-4" />
              </button>
            </div>
            <TextInput form={form} name={`items.${index}.title`} label="Titre" />
            <TextInput
              form={form}
              name={`items.${index}.description`}
              label="Description"
              multiline
            />
            <Controller
              control={form.control}
              name={`items.${index}.href`}
              render={({ field: hrefField, fieldState }) => (
                <FormField
                  id={`${id}-${field.id}-href`}
                  label="Lien (facultatif)"
                  error={fieldState.error?.message}
                >
                  <input
                    id={`${id}-${field.id}-href`}
                    className={inputClassName}
                    placeholder="/catalogue"
                    value={hrefField.value ?? ''}
                    onChange={(event) =>
                      hrefField.onChange(event.target.value.trim() ? event.target.value : null)
                    }
                  />
                </FormField>
              )}
            />
          </li>
        ))}
      </ol>
      <button
        type="button"
        disabled={items.fields.length >= 12}
        onClick={() => items.append({ title: '', description: '', href: null })}
        className={buttonClassName('secondary')}
      >
        <Plus aria-hidden="true" className="size-4" />
        Ajouter une carte
      </button>
    </SectionFormShell>
  );
}

function ImageTextForm(props: TypedFormProps<'imageText'>) {
  const form = useForm<SectionDataMap['imageText']>({
    resolver: zodResolver(sectionDataSchemas.imageText),
    defaultValues: props.initial,
  });
  const id = useId();
  return (
    <SectionFormShell {...shellProps(props, form)}>
      <UnsavedChangesGuard when={form.formState.isDirty && !props.pending} />
      <TextInput form={form} name="title" label="Titre" />
      <ParagraphsInput form={form} name="paragraphs" label="Texte" />
      <ImageInput form={form} name="imageId" label="Image" media={props.media} required />
      <FormField id={`${id}-position`} label="Position de l’image">
        <select
          id={`${id}-position`}
          className={inputClassName}
          {...form.register('imagePosition')}
        >
          <option value="right">À droite</option>
          <option value="left">À gauche</option>
        </select>
      </FormField>
      <LinkInput form={form} name="link" label="Bouton" optional />
    </SectionFormShell>
  );
}

function CallToActionForm(props: TypedFormProps<'callToAction'>) {
  const form = useForm<SectionDataMap['callToAction']>({
    resolver: zodResolver(sectionDataSchemas.callToAction),
    defaultValues: props.initial,
  });
  return (
    <SectionFormShell {...shellProps(props, form)}>
      <UnsavedChangesGuard when={form.formState.isDirty && !props.pending} />
      <TextInput form={form} name="title" label="Titre" />
      <TextInput form={form} name="text" label="Texte (facultatif)" multiline />
      <LinkInput form={form} name="link" label="Bouton" />
    </SectionFormShell>
  );
}

function FaqForm(props: TypedFormProps<'faq'>) {
  const form = useForm<SectionDataMap['faq']>({
    resolver: zodResolver(sectionDataSchemas.faq),
    defaultValues: props.initial,
  });
  const items = useFieldArray({ control: form.control, name: 'items' });
  return (
    <SectionFormShell {...shellProps(props, form)}>
      <UnsavedChangesGuard when={form.formState.isDirty && !props.pending} />
      <TextInput form={form} name="title" label="Titre (facultatif)" />
      <ol className="space-y-3">
        {items.fields.map((field, index) => (
          <li key={field.id} className="space-y-3 rounded-lg border border-forest/10 p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">Question {index + 1}</p>
              <button
                type="button"
                disabled={items.fields.length === 1}
                onClick={() => items.remove(index)}
                aria-label="Supprimer la question"
                className={buttonClassName('ghost', 'px-2 text-red-700')}
              >
                <Trash2 aria-hidden="true" className="size-4" />
              </button>
            </div>
            <TextInput form={form} name={`items.${index}.question`} label="Question" />
            <TextInput form={form} name={`items.${index}.answer`} label="Réponse" multiline />
          </li>
        ))}
      </ol>
      <button
        type="button"
        disabled={items.fields.length >= 30}
        onClick={() => items.append({ question: '', answer: '' })}
        className={buttonClassName('secondary')}
      >
        <Plus aria-hidden="true" className="size-4" />
        Ajouter une question
      </button>
    </SectionFormShell>
  );
}

function FeaturedProductsForm(props: TypedFormProps<'featuredProducts'>) {
  const form = useForm<SectionDataMap['featuredProducts']>({
    resolver: zodResolver(sectionDataSchemas.featuredProducts),
    defaultValues: props.initial,
  });
  const id = useId();
  return (
    <SectionFormShell {...shellProps(props, form)}>
      <UnsavedChangesGuard when={form.formState.isDirty && !props.pending} />
      <p className="text-sm text-charcoal/70">
        Affiche les produits publiés cochés « mis en avant ».
      </p>
      <TextInput form={form} name="title" label="Titre (facultatif)" />
      <TextInput form={form} name="intro" label="Introduction (facultatif)" multiline />
      <FormField
        id={`${id}-limit`}
        label="Nombre maximal de produits"
        error={form.formState.errors.limit?.message}
      >
        <input
          id={`${id}-limit`}
          type="number"
          min={1}
          max={12}
          className={inputClassName}
          {...form.register('limit', { valueAsNumber: true })}
        />
      </FormField>
    </SectionFormShell>
  );
}

function ServicesListForm(props: TypedFormProps<'servicesList'>) {
  const form = useForm<SectionDataMap['servicesList']>({
    resolver: zodResolver(sectionDataSchemas.servicesList),
    defaultValues: props.initial,
  });
  return (
    <SectionFormShell {...shellProps(props, form)}>
      <UnsavedChangesGuard when={form.formState.isDirty && !props.pending} />
      <p className="text-sm text-charcoal/70">
        Affiche les services publiés, dans l’ordre défini dans « Services ».
      </p>
      <TextInput form={form} name="title" label="Titre (facultatif)" />
      <TextInput form={form} name="intro" label="Introduction (facultatif)" multiline />
    </SectionFormShell>
  );
}

function ContactInfoForm(props: TypedFormProps<'contactInfo'>) {
  const form = useForm<SectionDataMap['contactInfo']>({
    resolver: zodResolver(sectionDataSchemas.contactInfo),
    defaultValues: props.initial,
  });
  return (
    <SectionFormShell {...shellProps(props, form)}>
      <UnsavedChangesGuard when={form.formState.isDirty && !props.pending} />
      <TextInput form={form} name="title" label="Titre (facultatif)" />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextInput form={form} name="phone" label="Téléphone" />
        <TextInput form={form} name="whatsapp" label="WhatsApp" />
        <TextInput form={form} name="email" label="Email" />
        <TextInput form={form} name="hours" label="Horaires" />
      </div>
      <TextInput form={form} name="address" label="Adresse" multiline />
    </SectionFormShell>
  );
}

function SiteIdentityForm(props: TypedFormProps<'siteIdentity'>) {
  const form = useForm<SectionDataMap['siteIdentity']>({
    resolver: zodResolver(sectionDataSchemas.siteIdentity),
    defaultValues: props.initial,
  });
  return (
    <SectionFormShell {...shellProps(props, form)}>
      <UnsavedChangesGuard when={form.formState.isDirty && !props.pending} />
      <TextInput form={form} name="name" label="Nom affiché" />
      <TextInput form={form} name="tagline" label="Accroche du pied de page" multiline />
    </SectionFormShell>
  );
}

export interface SectionFormProps extends CommonProps {
  type: SectionType;
  /** Données existantes (édition) ; absentes pour une nouvelle section. */
  data?: Record<string, unknown>;
  onSave: (data: Record<string, unknown>) => void;
}

/** Formulaire d'une section selon son type, prérempli et validé par le schéma correspondant. */
export function SectionForm({ type, data, onSave, ...common }: SectionFormProps) {
  const save = (values: object) => onSave({ ...values });
  switch (type) {
    case 'hero':
      return (
        <HeroForm
          {...common}
          initial={readSectionData('hero', data) ?? emptySectionData.hero}
          onSave={save}
        />
      );
    case 'richText':
      return (
        <RichTextForm
          {...common}
          initial={readSectionData('richText', data) ?? emptySectionData.richText}
          onSave={save}
        />
      );
    case 'cards':
      return (
        <CardsForm
          {...common}
          initial={readSectionData('cards', data) ?? emptySectionData.cards}
          onSave={save}
        />
      );
    case 'imageText':
      return (
        <ImageTextForm
          {...common}
          initial={readSectionData('imageText', data) ?? emptySectionData.imageText}
          onSave={save}
        />
      );
    case 'callToAction':
      return (
        <CallToActionForm
          {...common}
          initial={readSectionData('callToAction', data) ?? emptySectionData.callToAction}
          onSave={save}
        />
      );
    case 'faq':
      return (
        <FaqForm
          {...common}
          initial={readSectionData('faq', data) ?? emptySectionData.faq}
          onSave={save}
        />
      );
    case 'featuredProducts':
      return (
        <FeaturedProductsForm
          {...common}
          initial={readSectionData('featuredProducts', data) ?? emptySectionData.featuredProducts}
          onSave={save}
        />
      );
    case 'servicesList':
      return (
        <ServicesListForm
          {...common}
          initial={readSectionData('servicesList', data) ?? emptySectionData.servicesList}
          onSave={save}
        />
      );
    case 'contactInfo':
      return (
        <ContactInfoForm
          {...common}
          initial={readSectionData('contactInfo', data) ?? emptySectionData.contactInfo}
          onSave={save}
        />
      );
    case 'siteIdentity':
      return (
        <SiteIdentityForm
          {...common}
          initial={readSectionData('siteIdentity', data) ?? emptySectionData.siteIdentity}
          onSave={save}
        />
      );
  }
}
