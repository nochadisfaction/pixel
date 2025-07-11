import { useState } from 'react'

interface StorageLocation {
  id: string
  name: string
  type: 'local' | 's3' | 'azure' | 'gcp'
  path: string | undefined
  bucket: string | undefined
  region: string | undefined
  credentialsValid: boolean
  isDefault: boolean
  status: 'active' | 'error' | 'configuring'
  lastSync: string | undefined
}

const BackupLocationTab = () => {
  const [locations, setLocations] = useState<StorageLocation[]>([
    {
      id: '1',
      name: 'Local Storage',
      type: 'local',
      path: '/var/backups/pixelated',
      credentialsValid: true,
      isDefault: true,
      status: 'active',
      lastSync: '2025-03-15T14:30:00Z',
    },
    {
      id: '2',
      name: 'AWS S3 Backup',
      type: 's3',
      bucket: 'pixelated-backups',
      region: 'us-west-2',
      credentialsValid: true,
      isDefault: false,
      status: 'active',
      lastSync: '2025-03-15T14:30:00Z',
    },
  ])

  const [isAddingLocation, setIsAddingLocation] = useState(false)
  const [isFormLoading, setIsFormLoading] = useState(false)
  const [newLocation, setNewLocation] = useState<Partial<StorageLocation>>({
    type: 'local',
    name: '',
    path: '',
    bucket: '',
    region: '',
    isDefault: false,
  })

  const handleAddLocation = () => {
    setIsAddingLocation(true)
  }

  const handleCancelAdd = () => {
    setIsAddingLocation(false)
    setNewLocation({
      type: 'local',
      name: '',
      path: '',
      bucket: '',
      region: '',
      isDefault: false,
    })
  }

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value, type } = e.target

    if (type === 'checkbox') {
      const target = e.target as HTMLInputElement
      setNewLocation({
        ...newLocation,
        [name]: target.checked,
      })
    } else {
      setNewLocation({
        ...newLocation,
        [name]: value,
      })
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setIsFormLoading(true)

    // Simulate API call
    setTimeout(() => {
      const id = Math.random().toString(36).substring(7)

      // Handle default location changes
      let updatedLocations = [...locations]
      if (newLocation.isDefault) {
        updatedLocations = updatedLocations.map((loc) => ({
          ...loc,
          isDefault: false,
        }))
      }

      const createdLocation: StorageLocation = {
        id,
        name: newLocation.name || 'New Location',
        type: newLocation.type as 'local' | 's3' | 'azure' | 'gcp',
        path: newLocation.path,
        bucket: newLocation.bucket,
        region: newLocation.region,
        credentialsValid: true,
        isDefault: newLocation.isDefault || false,
        status: 'active',
        lastSync: new Date().toISOString(),
      }

      setLocations([...updatedLocations, createdLocation])
      setIsAddingLocation(false)
      setIsFormLoading(false)
      setNewLocation({
        type: 'local',
        name: '',
        path: '',
        bucket: '',
        region: '',
        isDefault: false,
      })
    }, 1000)
  }

  const setDefaultLocation = (id: string) => {
    setLocations(
      locations.map((location) => ({
        ...location,
        isDefault: location.id === id,
      })),
    )
  }

  const removeLocation = (id: string) => {
    // Don't allow removing the default location
    const locationToRemove = locations.find((loc) => loc.id === id)
    if (locationToRemove?.isDefault) {
      return
    }

    setLocations(locations.filter((location) => location.id !== id))
  }

  const testConnection = (id: string) => {
    setLocations(
      locations.map((location) =>
        location.id === id ? { ...location, status: 'configuring' } : location,
      ),
    )

    // Simulate testing connection
    setTimeout(() => {
      setLocations(
        locations.map((location) =>
          location.id === id
            ? {
                ...location,
                status: 'active',
                credentialsValid: true,
                lastSync: new Date().toISOString(),
              }
            : location,
        ),
      )
    }, 2000)
  }

  return (
    <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg">
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-semibold">Backup Storage Locations</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Configure where backup data is stored. For redundancy, configure
              multiple locations.
            </p>
          </div>
          <button
            type="button"
            onClick={handleAddLocation}
            disabled={isAddingLocation}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            Add Location
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-750">
            <tr>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
              >
                Name
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
              >
                Type
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
              >
                Location
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
              >
                Status
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
              >
                Default
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
              >
                Last Sync
              </th>
              <th scope="col" className="relative px-6 py-3">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-800 dark:divide-gray-700">
            {locations.map((location) => (
              <tr key={location.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                  {location.name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                  {location.type === 'local' && 'Local Storage'}
                  {location.type === 's3' && 'AWS S3'}
                  {location.type === 'azure' && 'Azure Blob Storage'}
                  {location.type === 'gcp' && 'Google Cloud Storage'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                  {location.type === 'local' && location.path}
                  {location.type === 's3' && `s3://${location.bucket}`}
                  {location.type === 'azure' && `Azure: ${location.bucket}`}
                  {location.type === 'gcp' && `GCS: ${location.bucket}`}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {location.status === 'active' && (
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100">
                      Active
                    </span>
                  )}
                  {location.status === 'error' && (
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100">
                      Error
                    </span>
                  )}
                  {location.status === 'configuring' && (
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100">
                      Configuring...
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                  {location.isDefault ? (
                    <span className="text-primary-600 dark:text-primary-400 font-medium">
                      Default
                    </span>
                  ) : (
                    <button
                      onClick={() => setDefaultLocation(location.id)}
                      className="text-gray-600 hover:text-primary-600 dark:text-gray-400 dark:hover:text-primary-400 font-medium"
                    >
                      Set as default
                    </button>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                  {location.lastSync
                    ? new Date(location.lastSync).toLocaleString()
                    : '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex space-x-2 justify-end">
                    <button
                      onClick={() => testConnection(location.id)}
                      disabled={location.status === 'configuring'}
                      className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300"
                    >
                      Test
                    </button>
                    {!location.isDefault && (
                      <button
                        onClick={() => removeLocation(location.id)}
                        className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isAddingLocation && (
        <div className="p-6 border-t border-gray-200 dark:border-gray-700">
          <h4 className="text-lg font-medium mb-4">Add New Storage Location</h4>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
              <div className="sm:col-span-3">
                <label
                  htmlFor="name"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Location Name
                </label>
                <input
                  type="text"
                  name="name"
                  id="name"
                  value={newLocation.name}
                  onChange={handleInputChange}
                  required
                  className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm dark:bg-gray-700"
                />
              </div>

              <div className="sm:col-span-3">
                <label
                  htmlFor="type"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Storage Type
                </label>
                <select
                  id="type"
                  name="type"
                  value={newLocation.type}
                  onChange={handleInputChange}
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md dark:bg-gray-700"
                >
                  <option value="local">Local Storage</option>
                  <option value="s3">AWS S3</option>
                  <option value="azure">Azure Blob Storage</option>
                  <option value="gcp">Google Cloud Storage</option>
                </select>
              </div>

              {newLocation.type === 'local' && (
                <div className="sm:col-span-6">
                  <label
                    htmlFor="path"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    File Path
                  </label>
                  <input
                    type="text"
                    name="path"
                    id="path"
                    value={newLocation.path}
                    onChange={handleInputChange}
                    required
                    placeholder="/path/to/backup/directory"
                    className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm dark:bg-gray-700"
                  />
                </div>
              )}

              {(newLocation.type === 's3' ||
                newLocation.type === 'azure' ||
                newLocation.type === 'gcp') && (
                <>
                  <div className="sm:col-span-4">
                    <label
                      htmlFor="bucket"
                      className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                    >
                      Bucket Name
                    </label>
                    <input
                      type="text"
                      name="bucket"
                      id="bucket"
                      value={newLocation.bucket}
                      onChange={handleInputChange}
                      required
                      className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm dark:bg-gray-700"
                    />
                  </div>

                  {newLocation.type === 's3' && (
                    <div className="sm:col-span-2">
                      <label
                        htmlFor="region"
                        className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                      >
                        Region
                      </label>
                      <input
                        type="text"
                        name="region"
                        id="region"
                        value={newLocation.region}
                        onChange={handleInputChange}
                        placeholder="us-west-2"
                        className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm dark:bg-gray-700"
                      />
                    </div>
                  )}
                </>
              )}

              <div className="sm:col-span-6">
                <div className="flex items-start mt-3">
                  <div className="flex items-center h-5">
                    <input
                      id="isDefault"
                      name="isDefault"
                      type="checkbox"
                      checked={newLocation.isDefault}
                      onChange={handleInputChange}
                      className="focus:ring-primary-500 h-4 w-4 text-primary-600 border-gray-300 rounded dark:border-gray-600 dark:bg-gray-700"
                    />
                  </div>
                  <div className="ml-3 text-sm">
                    <label
                      htmlFor="isDefault"
                      className="font-medium text-gray-700 dark:text-gray-300"
                    >
                      Make this the default backup location
                    </label>
                    <p className="text-gray-500 dark:text-gray-400">
                      Default locations are used for all backups unless
                      otherwise specified
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={handleCancelAdd}
                className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-650 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isFormLoading}
                className={`inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white ${
                  isFormLoading
                    ? 'bg-gray-400'
                    : 'bg-primary-600 hover:bg-primary-700'
                } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500`}
              >
                {isFormLoading ? (
                  <>
                    <svg
                      className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Adding...
                  </>
                ) : (
                  'Add Location'
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}

export default BackupLocationTab
