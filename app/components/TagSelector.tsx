'use client';
import React, { useState, useEffect } from 'react';

interface TagGroup {
  id: string;
  name: string;
  slug: string;
  color?: string;
  icon?: string;
  allowCustomValues: boolean;
  isRequired: boolean;
  maxSelections: number;
  isActive: boolean;
  tags: Tag[];
}

interface Tag {
  id: string;
  name: string;
  slug: string;
  color?: string;
  icon?: string;
  isCustom: boolean;
  customValue?: string;
  isActive: boolean;
}

interface SelectedTag {
  tagId: string;
  tagName: string;
  groupId: string;
  groupName: string;
  customValue?: string;
  color?: string;
}

interface TagSelectorProps {
  selectedTags: SelectedTag[];
  onTagsChange: (tags: SelectedTag[]) => void;
  disabled?: boolean;
}

export default function TagSelector({ selectedTags, onTagsChange, disabled = false }: TagSelectorProps) {
  const [tagGroups, setTagGroups] = useState<TagGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [customValues, setCustomValues] = useState<{[key: string]: string}>({});
  const [showCustomInput, setShowCustomInput] = useState<{[key: string]: boolean}>({});

  useEffect(() => {
    fetchTagGroups();
  }, []);

  const fetchTagGroups = async () => {
    try {
      const response = await fetch('/api/tag-groups');
      if (!response.ok) {
        throw new Error('Failed to fetch tag groups');
      }
      const data = await response.json();
      setTagGroups(data.filter((group: TagGroup) => group.isActive));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const isTagSelected = (tagId: string) => {
    return selectedTags.some(t => t.tagId === tagId);
  };

  const getSelectedTagsForGroup = (groupId: string) => {
    return selectedTags.filter(t => t.groupId === groupId);
  };

  const canSelectMoreTags = (group: TagGroup) => {
    if (group.maxSelections === 0) return true; // Unlimited
    const selectedCount = getSelectedTagsForGroup(group.id).length;
    return selectedCount < group.maxSelections;
  };

  const handleTagToggle = (tag: Tag, group: TagGroup) => {
    const isSelected = isTagSelected(tag.id);
    
    if (isSelected) {
      // Remove tag
      const newTags = selectedTags.filter(t => t.tagId !== tag.id);
      onTagsChange(newTags);
    } else {
      // Add tag (if allowed)
      if (!canSelectMoreTags(group)) {
        alert(`You can only select up to ${group.maxSelections} tag(s) from ${group.name}`);
        return;
      }

      const newTag: SelectedTag = {
        tagId: tag.id,
        tagName: tag.name,
        groupId: group.id,
        groupName: group.name,
        color: tag.color || group.color,
        customValue: tag.isCustom ? tag.customValue : undefined,
      };

      onTagsChange([...selectedTags, newTag]);
    }
  };

  const handleCustomValueChange = (groupId: string, value: string) => {
    setCustomValues({
      ...customValues,
      [groupId]: value
    });
  };

  const handleAddCustomTag = (group: TagGroup) => {
    const customValue = customValues[group.id]?.trim();
    if (!customValue) return;

    if (!canSelectMoreTags(group)) {
      alert(`You can only select up to ${group.maxSelections} tag(s) from ${group.name}`);
      return;
    }

    // Check if custom value already exists as selected tag
    const existsAsSelected = selectedTags.some(t => 
      t.groupId === group.id && 
      (t.customValue === customValue || t.tagName.toLowerCase() === customValue.toLowerCase())
    );

    if (existsAsSelected) {
      alert('This custom value is already selected');
      return;
    }

    // Create a temporary custom tag
    const customTag: SelectedTag = {
      tagId: `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      tagName: customValue,
      groupId: group.id,
      groupName: group.name,
      customValue: customValue,
      color: group.color,
    };

    onTagsChange([...selectedTags, customTag]);
    
    // Clear the input
    setCustomValues({
      ...customValues,
      [group.id]: ''
    });
    setShowCustomInput({
      ...showCustomInput,
      [group.id]: false
    });
  };

  const handleRemoveTag = (tagId: string) => {
    const newTags = selectedTags.filter(t => t.tagId !== tagId);
    onTagsChange(newTags);
  };

  const updateCustomValue = (tagId: string, newCustomValue: string) => {
    const newTags = selectedTags.map(t => 
      t.tagId === tagId 
        ? { ...t, customValue: newCustomValue, tagName: newCustomValue }
        : t
    );
    onTagsChange(newTags);
  };

  if (loading) return <div className="p-4 text-center">Loading tags...</div>;

  if (error) {
    return (
      <div className="p-4 bg-red-100 text-red-700 rounded">
        Error loading tags: {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Selected Tags Summary */}
      {selectedTags.length > 0 && (
        <div className="bg-blue-50 p-4 rounded-lg">
          <h4 className="font-medium text-blue-900 mb-3">Selected Tags</h4>
          <div className="flex flex-wrap gap-2">
            {selectedTags.map((selectedTag) => (
              <div
                key={selectedTag.tagId}
                className="inline-flex items-center gap-2 px-3 py-1 bg-white rounded-full text-sm border shadow-sm"
              >
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: selectedTag.color || '#3B82F6' }}
                ></div>
                <span className="font-medium">{selectedTag.groupName}:</span>
                {selectedTag.customValue ? (
                  <input
                    type="text"
                    value={selectedTag.customValue}
                    onChange={(e) => updateCustomValue(selectedTag.tagId, e.target.value)}
                    className="bg-transparent border-none outline-none min-w-0 flex-1"
                    disabled={disabled}
                  />
                ) : (
                  <span>{selectedTag.tagName}</span>
                )}
                {!disabled && (
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(selectedTag.tagId)}
                    className="text-red-500 hover:text-red-700 ml-1"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tag Groups */}
      {tagGroups.map((group) => {
        const selectedInGroup = getSelectedTagsForGroup(group.id);
        const canSelectMore = canSelectMoreTags(group);
        
        return (
          <div key={group.id} className="border rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                {group.color && (
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: group.color }}
                  ></div>
                )}
                <h3 className="font-medium text-gray-900">
                  {group.name}
                  {group.isRequired && <span className="text-red-500 ml-1">*</span>}
                </h3>
                <span className="text-sm text-gray-500">
                  ({selectedInGroup.length}
                  {group.maxSelections > 0 && `/${group.maxSelections}`} selected)
                </span>
              </div>
              
              {group.allowCustomValues && canSelectMore && !disabled && (
                <button
                  type="button"
                  onClick={() => setShowCustomInput({
                    ...showCustomInput,
                    [group.id]: !showCustomInput[group.id]
                  })}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  + Add Custom
                </button>
              )}
            </div>

            {/* Custom Value Input */}
            {group.allowCustomValues && showCustomInput[group.id] && (
              <div className="mb-3 flex gap-2">
                <input
                  type="text"
                  value={customValues[group.id] || ''}
                  onChange={(e) => handleCustomValueChange(group.id, e.target.value)}
                  placeholder={`Enter custom ${group.name.toLowerCase()}`}
                  className="flex-1 p-2 border rounded focus:border-blue-500 focus:outline-none"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddCustomTag(group);
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => handleAddCustomTag(group)}
                  className="px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  Add
                </button>
              </div>
            )}

            {/* Tags Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
              {group.tags?.filter(tag => tag.isActive).map((tag) => {
                const isSelected = isTagSelected(tag.id);
                const isDisabled = disabled || (!canSelectMore && !isSelected);
                
                return (
                  <button
                    type="button"
                    key={tag.id}
                    onClick={() => !isDisabled && handleTagToggle(tag, group)}
                    disabled={isDisabled}
                    className={`p-2 text-sm rounded border text-left transition-colors ${
                      isSelected
                        ? 'bg-blue-100 border-blue-500 text-blue-900'
                        : isDisabled
                        ? 'bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed'
                        : 'bg-white border-gray-300 text-gray-700 hover:border-gray-400'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: tag.color || group.color || '#3B82F6' }}
                      ></div>
                      <span className="truncate">{tag.name}</span>
                      {tag.isCustom && (
                        <span className="text-xs text-purple-600">*</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {(!group.tags || group.tags.length === 0) && (
              <div className="text-sm text-gray-500 text-center py-4">
                No tags available in this group.{' '}
                <a href={`/tags/add?groupId=${group.id}`} className="text-blue-600 hover:underline">
                  Add some tags
                </a>
              </div>
            )}
          </div>
        );
      })}

      {tagGroups.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <p>No tag groups available.</p>
          <a href="/tag-groups/add" className="text-blue-600 hover:underline">
            Create your first tag group
          </a>
        </div>
      )}
    </div>
  );
}