# Firestore Indexes for Copenhagen AirTaxi Form Manager

This document explains the required Firestore indexes for the application to work properly.

## Required Indexes

The application needs the following composite indexes to be created in your Firebase project:

### Forms Collection

| Collection | Fields indexed | Order |
|------------|----------------|-------|
| forms | published (filter) | Ascending |
| forms | title | Ascending |

### Submissions Collection

| Collection | Fields indexed | Order |
|------------|----------------|-------|
| submissions | userId (filter) | Ascending |
| submissions | status (filter) | Ascending |
| submissions | updatedAt | Descending |

| Collection | Fields indexed | Order |
|------------|----------------|-------|
| submissions | userId (filter) | Ascending |
| submissions | status (filter) | Ascending |
| submissions | submittedAt | Descending |

## How to Create Indexes

There are two ways to create the required indexes:

### Method 1: Using Error Messages

1. When you encounter an error message in the application that says "The query requires an index," it will include a link to create the required index.
2. Click on the link in the error message.
3. This will take you to the Firebase console with the index configuration pre-filled.
4. Click "Create index" to create the index.
5. Wait for the index to build (this usually takes a few minutes).

### Method 2: Creating Indexes Manually

1. Go to your [Firebase Console](https://console.firebase.google.com/).
2. Select your project.
3. In the left sidebar, click on "Firestore Database."
4. Click on the "Indexes" tab.
5. Click "Add index."
6. Enter the collection name and fields according to the tables above.
7. Click "Create."

## Checking Index Status

After creating an index, it needs to be built before it can be used. To check the status:

1. Go to the Indexes tab in Firestore.
2. Look for your index in the list.
3. Check the "Status" column. It should say "Building" initially and then change to "Enabled" when ready.

## Troubleshooting

If you're still seeing index errors after creating the required indexes:

1. Make sure the index has finished building.
2. Check that the fields and order match exactly with what's required.
3. Try refreshing the application page.
4. Clear browser cache if needed.

## Additional Indexes

As you develop and add more features to the application, you may need to create additional indexes. Always check the error messages in the browser console and follow the links to create any required indexes.
