import requests

def check_isbn_in_norwegian_library(isbn):
    url = f"https://nb.bib.no/NBISAPI?isbn={isbn}"
    
    try:
        response = requests.get(url)
        if response.status_code == 200:
            data = response.text  # The response is in XML/HTML format
            if "Ingen treff" in data:
                return f"ISBN {isbn} not found in the Norwegian National Library."
            else:
                return f"ISBN {isbn} found! Check details here: {url}"
        else:
            return f"Error: Received status code {response.status_code}"
    except Exception as e:
        return f"An error occurred: {e}"

# Example usage
isbn_list = ["0807522805", "0201082241"]  # Replace with your ISBNs
for isbn in isbn_list:
    print(check_isbn_in_norwegian_library(isbn))

